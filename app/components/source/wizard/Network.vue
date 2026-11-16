<script setup lang="ts">
import * as S from '#shared/sources/network';
import { detachSkills } from '#shared/sources/skills';
import type { SourceDevice, SourceInput, SourceSettings } from '#shared/sources/types';
import type { WizardChange } from '#shared/sources/wizard';
import * as W from '#shared/sources/wizard/network';

// Port of legacy/src/views/Edit/Wizard/Sources/Network.js
const props = withDefaults(
	defineProps<{
		settings?: SourceSettings;
		config?: Record<string, unknown> | null;
		skills?: Record<string, unknown> | null;
		knownDevices?: SourceDevice[];
	}>(),
	{ settings: () => ({}), config: null, skills: null, knownDevices: () => [] },
);

const emit = defineEmits<{
	/** Legacy `onChange(type, settings, inputs, ready)`; the type is that of the wizard source (shared/sources/wizard). */
	change: [settings: SourceSettings, inputs: SourceInput[], ready: boolean];
	refresh: [];
}>();

// The network source extends the skills it is given, so it works on a copy.
const context = () => ({ settings: props.settings, config: props.config, skills: detachSkills(props.skills), knownDevices: props.knownDevices });

function report(change: WizardChange) {
	emit('change', change.settings, change.inputs, change.ready);
}

function update(what: string, value?: unknown) {
	report(W.update(context(), what, value));
}

onMounted(() => report(W.change(context())));

const settings = computed(() => W.initSettings(props.settings, S.initConfig(props.config)));
const protocol = computed(() => S.getProtocolClass(settings.value.address));
</script>

<template>
	<div class="space-y-4">
		<p>{{ $t('Enter the address of your network source:') }}</p>
		<UFormField :label="$t('Address')" :help="$t('Supports HTTP (HLS, DASH), RTP, RTSP, RTMP, SRT and more.')">
			<UInput
				:model-value="settings.address"
				placeholder="rtsp://ip:port/path"
				class="w-full"
				@update:model-value="(v: unknown) => update('address', String(v))"
			/>
		</UFormField>
		<UCheckbox v-if="protocol === 'rtsp'" :model-value="settings.rtsp.udp === true" :label="$t('UDP transport')" @update:model-value="update('rtsp.udp')" />
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			<UFormField :label="$t('Username')" :help="$t('Username for the device.')">
				<UInput
					:model-value="settings.username"
					:disabled="protocol === 'srt'"
					class="w-full"
					@update:model-value="(v) => update('username', String(v))"
				/>
			</UFormField>
			<UFormField :label="$t('Password')" :help="$t('Password for the device.')">
				<SettingsPassword :model-value="settings.password" :disabled="protocol === 'srt'" @update:model-value="(v: string) => update('password', v)" />
			</UFormField>
		</div>
	</div>
</template>
