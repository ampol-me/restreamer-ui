// Ported from legacy/src/views/Edit/Wizard/Sources/AVFoundation.js
import * as S from '../avfoundation';
import type { SourceCapability } from '../types';
import type { WizardChange, WizardProps } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */

// Format, framerate (a number here, a string in the editor source) and size are always reset.
function initSettings(initialSettings?: any): S.Settings {
	const settings = {
		...S.func.initSettings(initialSettings),
		format: 'nv12',
		framerate: 25,
		size: 'auto',
	};

	return settings;
}

const report = (props: WizardProps, settings: S.Settings): WizardChange => {
	const filteredDevices = (props.knownDevices ?? []).filter((device) => device.media === 'video');

	return { type: S.id, settings, inputs: S.func.createInputs(settings), ready: filteredDevices.length !== 0 ? true : false };
};

const change = (props: WizardProps): WizardChange => report(props, initSettings(props.settings));

const update = (props: WizardProps, what: string, value?: unknown): WizardChange => {
	const settings = initSettings(props.settings);

	if (what in settings) {
		settings[what] = value;
	}

	return report(props, settings);
};

const id = 'avfoundation';
const type = 'avfoundation';
const name = 'Connected device';
const capabilities: SourceCapability[] = ['audio', 'video'];
const icon = 'i-lucide-apple';

export { id, type, name, capabilities, icon, initSettings, change, update };
