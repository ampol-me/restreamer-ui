// Ported from legacy/src/views/Edit/Wizard/Sources/InternalHLS.js
import * as S from '../network';
import type { SourceCapability } from '../types';
import type { WizardChange, WizardProps } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */

// Not registered, as in legacy: creating the input of an HLS push throws (see ../network createInputs).

const initSettings = (initialSettings: any, config: any): S.Settings => {
	const settings = {
		...S.func.initSettings(initialSettings, config),
		mode: 'push',
	};

	settings.push.type = 'hls';

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

	return { type: S.id, settings, inputs, ready: settings.address.length !== 0 };
};

const change = (props: WizardProps): WizardChange => {
	const { config, settings, skills } = init(props);

	return report(settings, config, skills);
};

// The legacy form has no fields.
const update = (props: WizardProps, _what?: string, _value?: unknown): WizardChange => change(props);

const id = 'hls';
const type = 'network';
const name = 'HLS server';
const capabilities: SourceCapability[] = ['audio', 'video'];
const icon = 'i-lucide-arrow-right-to-line';

export { id, type, name, capabilities, icon, initSettings, change, update };
