<script setup lang="ts">
import * as S from '#shared/sources/network';
import { detachSkills } from '#shared/sources/skills';
import type { SourceDevice, SourceInput, SourceSettings } from '#shared/sources/types';
import type { WizardChange } from '#shared/sources/wizard';
import * as W from '#shared/sources/wizard/internalrtmp';

// Port of legacy/src/views/Edit/Wizard/Sources/InternalRTMP.js
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

const config = computed(() => S.initConfig(props.config));
const settings = computed(() => W.initSettings(props.settings, config.value));
</script>

<template>
	<SourcePushStream
		protocol="rtmp"
		:config="config"
		:name="settings.push.name"
		:known-devices="knownDevices"
		@update:name="(name) => update('name', name)"
		@refresh="emit('refresh')"
	/>
</template>
