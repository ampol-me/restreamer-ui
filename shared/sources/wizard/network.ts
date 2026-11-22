// Ported from legacy/src/views/Edit/Wizard/Sources/Network.js
import * as S from '../network';
import type { SourceCapability } from '../types';
import type { WizardChange, WizardProps } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */

const initSettings = (initialSettings: any, config: any): S.Settings => {
	const settings = {
		...S.func.initSettings(initialSettings, config),
		mode: 'pull',
	};

	return settings;
};

const init = (props: WizardProps) => {
	const config = S.func.initConfig(props.config);
	const settings = initSettings(props.settings, config);
	const skills = S.func.initSkills(props.skills);

	return { config, settings, skills };
};

const change = (props: WizardProps): WizardChange => {
	const { config, settings, skills } = init(props);

	return { type: S.id, settings, inputs: S.func.createInputs(settings, config, skills), ready: S.func.isValidURL(settings.address) };
};

// `what` is a top level setting ('address', 'username', 'password') or 'rtsp.udp'. As in legacy, any other 'rtsp.*' is ignored.
const update = (props: WizardProps, what: string, value?: unknown): WizardChange => {
	const { config, settings, skills } = init(props);

	if (what.startsWith('rtsp.')) {
		const key = what.slice('rtsp.'.length);
		if (['udp'].includes(key)) {
			settings.rtsp[key] = !settings.rtsp[key];
		}
	} else {
		settings[what] = value;
	}

	return { type: S.id, settings, inputs: S.func.createInputs(settings, config, skills), ready: S.func.isValidURL(settings.address) };
};

const id = 'network';
const type = 'network';
const name = 'Network source';
const capabilities: SourceCapability[] = ['audio', 'video'];
const icon = 'i-lucide-ethernet-port';

export { id, type, name, capabilities, icon, initSettings, change, update };
