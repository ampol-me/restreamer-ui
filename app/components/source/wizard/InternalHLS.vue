<script setup lang="ts">
import * as S from '#shared/sources/network';
import { detachSkills } from '#shared/sources/skills';
import type { SourceDevice, SourceInput, SourceSettings } from '#shared/sources/types';
import type { WizardChange } from '#shared/sources/wizard';
import * as W from '#shared/sources/wizard/internalhls';

// Port of legacy/src/views/Edit/Wizard/Sources/InternalHLS.js. Like in legacy the source is not registered
// (shared/sources/wizard/index.ts): creating the input of an HLS push throws, so mounting this form does too.
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

const context = () => ({ settings: props.settings, config: props.config, skills: detachSkills(props.skills), knownDevices: props.knownDevices });

function report(change: WizardChange) {
	emit('change', change.settings, change.inputs, change.ready);
}

onMounted(() => report(W.change(context())));

const address = computed(() => S.getHLS(S.initConfig(props.config)));
</script>

<template>
	<PlayerCopyField :label="$t('Send stream to this address:')" :value="address" />
</template>
