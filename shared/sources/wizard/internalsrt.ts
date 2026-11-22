// Ported from legacy/src/views/Edit/Wizard/Sources/InternalSRT.js
import * as S from '../network';
import type { SourceCapability } from '../types';
import type { WizardChange, WizardProps } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */

const initSettings = (initialSettings: any, config: any): S.Settings => {
	const settings = {
		...S.func.initSettings(initialSettings, config),
		mode: 'push',
	};

	settings.push.type = 'srt';

	return settings;
};

const init = (props: WizardProps) => {
	const config = S.func.initConfig(props.config);
	const settings = initSettings(props.settings, config);
	const skills = S.func.initSkills(props.skills);

	return { config, settings, skills };
};

// The address of the input is written back into the settings.
const report = (settings: S.Settings, config: S.Config, skills: S.Skills): WizardChange => {
	const inputs = S.func.createInputs(settings, config, skills);
	settings.address = inputs[0]!.address;

	return { type: S.id, settings, inputs, ready: config.srt.enabled };
};

const change = (props: WizardProps): WizardChange => {
	const { config, settings, skills } = init(props);

	return report(settings, config, skills);
};

// `what` is a key of settings.push (`name`); anything else leaves the settings as they are.
const update = (props: WizardProps, what: string, value?: unknown): WizardChange => {
	const { config, settings, skills } = init(props);

	if (what in settings.push) {
		settings.push[what] = value;
	}

	return report(settings, config, skills);
};

const id = 'srt';
const type = 'network';
const name = 'SRT server';
const capabilities: SourceCapability[] = ['audio', 'video'];
const icon = 'i-lucide-arrow-right-to-line';

export { id, type, name, capabilities, icon, initSettings, change, update };
