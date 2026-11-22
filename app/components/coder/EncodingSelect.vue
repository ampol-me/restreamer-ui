<script setup lang="ts">
import * as Decoders from '#shared/coders/decoders';
import * as Encoders from '#shared/coders/encoders';
import { getDecoderFields, getEncoderFields } from '#shared/coders/fields';
import type { CoderRegistry, DecoderModule, EncoderModule } from '#shared/coders/types';
import type { CoreSkills } from '#shared/core/types';
import type { MetadataCoder, MetadataProfileTrack, MetadataStream } from '#shared/metadata';

// Port of legacy/src/misc/EncodingSelect.js: pick the encoder (and, when there is a choice,
// the decoder) for one track of a profile and edit their settings.
const props = defineProps<{
	type: 'video' | 'audio';
	streams: MetadataStream[];
	profile: MetadataProfileTrack;
	// Codecs allowed as the output, e.g. ['copy', 'h264'].
	codecs: string[];
	skills: CoreSkills;
}>();

// `automatic` is true when nothing was chosen by the user: the settings were only completed
// with the coder's defaults and the mapping recomputed.
const emit = defineEmits<{ 'update:profile': [profile: MetadataProfileTrack, automatic: boolean] }>();

const { locale } = useI18n();

const encoderRegistry = computed(() => (props.type === 'video' ? Encoders.Video : Encoders.Audio) as unknown as CoderRegistry<EncoderModule>);
const decoderRegistry = computed(() => (props.type === 'video' ? Decoders.Video : Decoders.Audio) as unknown as CoderRegistry<DecoderModule>);

const availableEncoders = computed(() => props.skills.encoders?.[props.type] ?? []);
// Like legacy, only video decoders are offered.
const availableDecoders = computed(() => (props.type === 'video' ? (props.skills.decoders?.video ?? []) : []));

const stream = computed(() => {
	const s = props.profile.stream >= 0 ? props.streams[props.profile.stream] : undefined;
	return s && s.type === props.type ? s : null;
});

const ctx = computed(() => ({ stream: stream.value, skills: props.skills }));

const encoder = computed(() => {
	const coder = encoderRegistry.value.Get(props.profile.encoder.coder);
	return coder !== null && availableEncoders.value.includes(coder.coder) ? coder : null;
});

const encoderItems = computed(() => {
	const allowCopy = stream.value !== null && props.codecs.includes(stream.value.codec);

	return encoderRegistry.value
		.List()
		.filter((c) => availableEncoders.value.includes(c.coder) && props.codecs.includes(c.codec) && (c.coder !== 'copy' || allowCopy))
		.map((c) => ({ value: c.coder, label: c.name }));
});

const usable = computed(() => stream.value !== null && encoder.value !== null && encoderItems.value.length !== 0);

const decoderItems = computed(() => {
	if (!usable.value || stream.value === null || ['copy', 'none'].includes(encoder.value!.coder)) return [];

	return decoderRegistry.value.GetCodersForCodec(stream.value.codec, availableDecoders.value, 'any').map((c) => ({ value: c.coder, label: c.name }));
});

// The decoder is only part of the form when there is something to choose from.
const decoder = computed(() => {
	if (decoderItems.value.length < 2) return null;

	const coder = decoderRegistry.value.Get(props.profile.decoder.coder);
	return coder !== null && availableDecoders.value.includes(coder.coder) ? coder : null;
});

const encoderFields = computed(() => (encoder.value ? getEncoderFields(props.type, encoder.value.coder) : []));
const decoderFields = computed(() => (decoder.value ? getDecoderFields(props.type, decoder.value.coder) : []));

const COMPATIBILITY_LIST = {
	en: 'https://docs.datarhei.com/restreamer/knowledge-base/troubleshooting/encoding-compatibility-list',
	de: 'https://docs.datarhei.com/restreamer/v/de/wissensdatenbank/fehlersuche/kompatibilitaetsliste-fuer-encoder',
};
const COMPATIBILITY_TOPICS = ['h264_omx', 'h264_v4l2m2m', 'h264_nvenc', 'h264_vaapi', 'h264_videotoolbox', 'libx264', 'libx265', 'libvpx-vp9'];

const compatibilityUrl = computed(() => {
	if (props.type !== 'video' || !encoder.value || ['copy', 'none', 'rawvideo'].includes(encoder.value.coder)) return null;
	// Encoders without an entry in the list link to the documentation's front page, like legacy.
	if (!COMPATIBILITY_TOPICS.includes(encoder.value.coder)) return 'https://docs.datarhei.com/restreamer';
	return `${locale.value === 'de' ? COMPATIBILITY_LIST.de : COMPATIBILITY_LIST.en}#${encoder.value.coder}`;
});

function configured(coder: EncoderModule | DecoderModule, current: MetadataCoder, codec: string, settings: Record<string, unknown>): MetadataCoder {
	return { ...current, coder: coder.coder, codec, settings, mapping: coder.createMapping(settings, stream.value ?? undefined, props.skills) };
}

function encoderWith(settings: Record<string, unknown>): MetadataCoder {
	return configured(encoder.value!, props.profile.encoder, encoder.value!.codec, settings);
}

function decoderWith(settings: Record<string, unknown>): MetadataCoder {
	return configured(decoder.value!, props.profile.decoder, stream.value?.codec ?? '', settings);
}

function update(change: { encoder?: MetadataCoder; decoder?: MetadataCoder }, automatic: boolean) {
	emit('update:profile', { ...props.profile, ...change }, automatic);
}

// If the coder changes, use the coder's default settings.
function selectEncoder(name: string) {
	const coder = encoderRegistry.value.Get(name);
	if (coder === null) return;
	update(
		{ encoder: { ...props.profile.encoder, coder: coder.coder, codec: coder.codec, ...coder.defaults(stream.value ?? undefined, props.skills) } },
		false,
	);
}

function selectDecoder(name: string) {
	const coder = decoderRegistry.value.Get(name);
	if (coder === null) return;
	const codec = stream.value?.codec ?? '';
	update({ decoder: { ...props.profile.decoder, coder: coder.coder, codec, ...coder.defaults(stream.value ?? undefined, props.skills) } }, false);
}

const encoderSettings = computed(() => encoder.value?.init?.(props.profile.encoder.settings) ?? {});
const decoderSettings = computed(() => decoder.value?.init?.(props.profile.decoder.settings) ?? {});

// Legacy's settings components report back once when they appear: the stored settings completed
// with the coder's defaults and a fresh mapping. Do the same whenever a coder's form (re)appears.
watch(
	() => (usable.value ? `${props.type}/${encoder.value!.coder}/${decoder.value?.coder ?? ''}` : null),
	(shown) => {
		if (shown === null) return;
		update({ encoder: encoderWith(encoderSettings.value), ...(decoder.value ? { decoder: decoderWith(decoderSettings.value) } : {}) }, true);
	},
	{ immediate: true },
);
</script>

<template>
	<div v-if="stream" class="space-y-4">
		<p v-if="!usable" class="text-sm text-muted">{{ $t('No suitable encoder found.') }}</p>

		<template v-else>
			<p class="text-sm text-muted">{{ $t('Select your encoding setting:') }}</p>

			<UFormField :label="$t('Codec')">
				<USelect
					:model-value="profile.encoder.coder"
					:items="encoderItems"
					:placeholder="$t('Choose codec ...')"
					class="w-full"
					@update:model-value="(v) => selectEncoder(String(v))"
				/>
			</UFormField>

			<template v-if="decoderItems.length >= 2">
				<UFormField :label="$t('Decoder')">
					<USelect :model-value="profile.decoder.coder" :items="decoderItems" class="w-full" @update:model-value="(v) => selectDecoder(String(v))" />
				</UFormField>

				<CoderSettingsForm
					v-if="decoder && decoderFields.length"
					:fields="decoderFields"
					:model-value="decoderSettings"
					:ctx="ctx"
					@update:model-value="(settings) => update({ decoder: decoderWith(settings) }, false)"
				/>
			</template>

			<CoderSettingsForm
				v-if="encoderFields.length"
				:fields="encoderFields"
				:model-value="encoderSettings"
				:ctx="ctx"
				@update:model-value="(settings) => update({ encoder: encoderWith(settings) }, false)"
			/>

			<ULink v-if="compatibilityUrl" :to="compatibilityUrl" target="_blank" class="inline-flex items-center gap-1 text-sm text-primary">
				{{ $t('Compatibility list') }}
				<UIcon name="i-lucide-external-link" class="size-3.5" />
			</ULink>
		</template>
	</div>
</template>
