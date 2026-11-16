<script setup lang="ts">
import * as S from '#shared/sources/network';
import { fflags } from '#shared/sources/options';

// The advanced settings of the network source (legacy AdvancedSettings of Edit/Sources/Network.js).
const props = defineProps<{
	/** The network source settings with their defaults (`initSettings`). */
	settings: S.Settings;
}>();

// Checkboxes report no value: the source toggles them (`changeSettings`).
const emit = defineEmits<{ change: [section: string, what: string, value?: unknown] }>();

const { t } = useI18n();

const protocolClass = computed(() => S.getAdvancedProtocolClass(props.settings));
const analyzeduration = computed(() => S.getAnalyzedurationKey(props.settings));

const items = computed(() => [{ label: t('Advanced settings'), slot: 'advanced' as const }]);

const avoidNegativeTs = [
	{ value: 'make_non_negative', label: 'make_non_negative' },
	{ value: 'make_zero', label: 'make_zero' },
	{ value: 'auto', label: 'auto (default)' },
	{ value: 'disabled', label: 'disabled' },
];

// Like the legacy text fields, edited numbers are stored as the text that was typed.
const text = (section: string, what: string) => (value: unknown) => emit('change', section, what, String(value ?? ''));
</script>

<template>
	<UAccordion :items="items">
		<template #advanced>
			<div class="space-y-4 pb-4">
				<template v-if="protocolClass === 'rtsp'">
					<h3 class="font-medium text-highlighted">{{ $t('RTSP') }}</h3>
					<UCheckbox :model-value="settings.rtsp.udp === true" :label="$t('UDP transport')" @update:model-value="emit('change', 'rtsp', 'udp')" />
					<UFormField :label="$t('Socket timeout (microseconds)')">
						<UInput
							:model-value="String(settings.rtsp.stimeout)"
							type="number"
							:min="0"
							:step="1"
							class="w-full"
							@update:model-value="text('rtsp', 'stimeout')"
						/>
					</UFormField>
				</template>

				<template v-if="protocolClass === 'http'">
					<h3 class="font-medium text-highlighted">{{ $t('HTTP and HTTPS') }}</h3>
					<UCheckbox
						:model-value="settings.http.readNative === true"
						:label="$t('Read input at native speed')"
						@update:model-value="emit('change', 'http', 'readNative')"
					/>
					<UCheckbox
						:model-value="settings.http.forceFramerate === true"
						:label="$t('Force input framerate')"
						@update:model-value="emit('change', 'http', 'forceFramerate')"
					/>
					<UFormField v-if="settings.http.forceFramerate === true" :label="$t('Framerate')">
						<UInput
							:model-value="String(settings.http.framerate)"
							type="number"
							:min="0"
							:step="1"
							class="w-full"
							@update:model-value="text('http', 'framerate')"
						/>
					</UFormField>
					<UFormField label="User-Agent">
						<UInput :model-value="settings.http.userAgent" class="w-full" @update:model-value="text('http', 'userAgent')" />
					</UFormField>
					<UFormField label="Referrer">
						<UInput :model-value="settings.http.referer" class="w-full" @update:model-value="text('http', 'referer')" />
					</UFormField>
					<UFormField label="HTTP proxy">
						<UInput
							:model-value="settings.http.http_proxy"
							placeholder="https://123.123.123.123:443"
							class="w-full"
							@update:model-value="text('http', 'http_proxy')"
						/>
					</UFormField>
				</template>

				<h3 class="font-medium text-highlighted">{{ $t('General') }}</h3>
				<UFormField label="thread_queue_size">
					<UInput
						:model-value="String(settings.general.thread_queue_size)"
						type="number"
						:min="0"
						:step="1"
						class="w-full"
						@update:model-value="text('general', 'thread_queue_size')"
					/>
				</UFormField>
				<UFormField label="probesize (bytes)" :help="$t('Mininum {0}, default {1}', [32, 5000000])">
					<UInput
						:model-value="String(settings.general.probesize)"
						type="number"
						:min="32"
						:step="1"
						class="w-full"
						@update:model-value="text('general', 'probesize')"
					/>
				</UFormField>
				<UFormField label="max_probe_packets" :help="$t('Default {0}', [2500])">
					<UInput
						:model-value="String(settings.general.max_probe_packets)"
						type="number"
						:min="1"
						:step="1"
						class="w-full"
						@update:model-value="text('general', 'max_probe_packets')"
					/>
				</UFormField>
				<UFormField label="analyzeduration (microseconds)" :help="$t('Default {0} ({1} seconds)', [5000000, 5])">
					<UInput
						:model-value="String(settings.general[analyzeduration])"
						type="number"
						:min="1"
						:step="1"
						class="w-full"
						@update:model-value="text('general', analyzeduration)"
					/>
				</UFormField>
				<UFormField label="flags">
					<USelectMenu
						:model-value="settings.general.fflags"
						:items="fflags"
						multiple
						:search-input="false"
						class="w-full"
						@update:model-value="(v) => emit('change', 'general', 'fflags', v)"
					/>
				</UFormField>
				<UCheckbox :model-value="settings.general.copyts === true" :label="$t('copyts')" @update:model-value="emit('change', 'general', 'copyts')" />
				<UCheckbox
					:model-value="settings.general.start_at_zero === true"
					:label="$t('start_at_zero')"
					@update:model-value="emit('change', 'general', 'start_at_zero')"
				/>
				<UCheckbox
					:model-value="settings.general.use_wallclock_as_timestamps === true"
					:label="$t('use_wallclock_as_timestamps')"
					@update:model-value="emit('change', 'general', 'use_wallclock_as_timestamps')"
				/>
				<UFormField :label="$t('avoid_negative_ts')">
					<USelect
						:model-value="settings.general.avoid_negative_ts"
						:items="avoidNegativeTs"
						class="w-full"
						@update:model-value="(v) => emit('change', 'general', 'avoid_negative_ts', String(v))"
					/>
				</UFormField>
			</div>
		</template>
	</UAccordion>
</template>
