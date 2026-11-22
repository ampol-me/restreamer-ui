<script setup lang="ts">
import * as S from '#shared/sources/network';
import { detachSkills } from '#shared/sources/skills';
import type { SourceDevice, SourceInput, SourceSettings } from '#shared/sources/types';

// Port of legacy/src/views/Edit/Sources/Network.js: a stream pulled from an address or received
// by the internal RTMP / SRT server.
const props = withDefaults(
	defineProps<{
		settings?: SourceSettings;
		config?: Record<string, unknown>;
		skills?: Record<string, unknown> | null;
		knownDevices?: SourceDevice[];
	}>(),
	{ settings: () => ({}), config: () => ({}), skills: null, knownDevices: () => [] },
);

const emit = defineEmits<{
	'update:settings': [settings: SourceSettings];
	probe: [settings: SourceSettings, inputs: SourceInput[]];
	refresh: [];
}>();

const { t } = useI18n();

const config = computed(() => S.initConfig(props.config));
const settings = computed(() => S.initSettings(props.settings, config.value));
const skills = computed(() => S.initSkills(detachSkills(props.skills)));

const modes = computed(() => [
	{ value: 'pull', label: t('Pull Mode') },
	{ value: 'push', label: t('Receive Mode') },
]);

const authProtocol = computed(() => S.isAuthProtocol(settings.value.address));
const validURL = computed(() => S.isValidURL(settings.value.address));
const supportedProtocol = computed(() => S.isSupportedProtocol(settings.value.address, skills.value.protocols.input));

const supportsRTMP = computed(() => S.isSupportedProtocol('rtmp://', skills.value.protocols.input));
const supportsSRT = computed(() => S.isSupportedProtocol('srt://', skills.value.protocols.input));

const pushTypes = computed(() => [
	{ value: 'rtmp', label: 'RTMP', disabled: !supportsRTMP.value },
	{ value: 'srt', label: 'SRT', disabled: !supportsSRT.value },
]);

// HLS push is not offered (see pushTypes) but stored settings may still carry it.
const pushType = computed(() => settings.value.push.type);
const pushServer = computed(() => (pushType.value === 'rtmp' || pushType.value === 'srt' ? pushType.value : null));
const pushEnabled = computed(() => pushServer.value === null || config.value[pushServer.value].enabled !== false);

const hlsAddress = computed(() => S.getHLS(config.value));

function change(section: string, what: string, value?: unknown) {
	// changeSettings writes into the settings it is given, so it gets its own copy.
	emit('update:settings', S.changeSettings(S.initSettings(props.settings, config.value), config.value, section, what, value));
}

function probe() {
	emit('probe', settings.value, S.createInputs(settings.value, config.value, skills.value));
}
</script>

<template>
	<div class="space-y-4">
		<UFormField :label="$t('Pull or recieve the data:')">
			<USelect :model-value="settings.mode" :items="modes" class="w-full" @update:model-value="(v) => change('', 'mode', String(v))" />
		</UFormField>

		<template v-if="settings.mode === 'pull'">
			<p>{{ $t('Enter the address of your network source:') }}</p>
			<UFormField :label="$t('Address')" :help="$t('Supports HTTP (HLS, DASH), RTP, RTSP, RTMP, SRT and more.')">
				<UInput
					:model-value="settings.address"
					placeholder="rtsp://ip:port/path"
					class="w-full"
					@update:model-value="(v: unknown) => change('', 'address', String(v))"
				/>
			</UFormField>

			<template v-if="validURL">
				<UAlert
					v-if="!supportedProtocol"
					color="error"
					variant="subtle"
					icon="i-lucide-triangle-alert"
					:title="$t('This protocol is unknown or not supported by the available FFmpeg binary.')"
				/>
				<template v-else>
					<div v-if="authProtocol" class="grid grid-cols-1 gap-4 md:grid-cols-2">
						<UFormField :label="$t('Username')" :help="$t('Username for the device.')">
							<UInput :model-value="settings.username" class="w-full" @update:model-value="(v) => change('', 'username', String(v))" />
						</UFormField>
						<UFormField :label="$t('Password')" :help="$t('Password for the device.')">
							<SettingsPassword :model-value="settings.password" @update:model-value="(v: string) => change('', 'password', v)" />
						</UFormField>
					</div>
					<SourceNetworkAdvanced :settings="settings" @change="change" />
				</template>
			</template>

			<UButton :label="$t('Probe')" :disabled="!validURL || !supportedProtocol" @click="probe" />
		</template>

		<UAlert
			v-else-if="!supportsRTMP && !supportsSRT"
			color="error"
			variant="subtle"
			icon="i-lucide-triangle-alert"
			:title="$t('The available FFmpeg binary doesn\'t support any of the required protocols.')"
		/>

		<template v-else>
			<UFormField :label="$t('Protocol')">
				<USelect :model-value="pushType" :items="pushTypes" class="w-full" @update:model-value="(v) => change('push', 'type', String(v))" />
			</UFormField>

			<SourcePushStream
				v-if="pushServer"
				:protocol="pushServer"
				:config="config"
				:name="settings.push.name"
				:known-devices="knownDevices"
				@update:name="(name) => change('push', 'name', name)"
				@refresh="emit('refresh')"
			/>
			<PlayerCopyField v-else-if="pushType === 'hls'" :label="$t('Send stream to this address:')" :value="hlsAddress" />

			<template v-if="(pushServer || pushType === 'hls') && pushEnabled">
				<SourceNetworkAdvanced :settings="settings" @change="change" />
				<UButton :label="$t('Probe')" :disabled="pushServer !== null && settings.push.name === 'none'" @click="probe" />
			</template>
		</template>
	</div>
</template>
