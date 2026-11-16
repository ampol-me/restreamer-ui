// Ported from legacy/src/views/Edit/Wizard/Sources/Raspicam.js
import * as S from '../raspicam';
import type { SourceCapability, SourceDevice } from '../types';
import type { WizardChange, WizardProps } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */

// A device that is not (or no longer) known is replaced by the first known device.
function initSettings(initialSettings: any, knownDevices: SourceDevice[]): S.Settings {
	const settings = {
		...S.func.initSettings(initialSettings),
	};

	const devices = initDevices(knownDevices);

	if (devices.length !== 0) {
		let found = false;
		for (const device of devices) {
			if (settings.device === device.id) {
				found = true;
				break;
			}
		}

		if (found === false) {
			settings.device = '';
		}
	}

	if (devices.length !== 0) {
		const device = devices[0]!;

		if (settings.device.length === 0) {
			settings.device = device.id;
		}
	}

	return settings;
}

// As in legacy, a video device without `extra` throws.
function initDevices(initialDevices: SourceDevice[]): SourceDevice[] {
	const devices = initialDevices.filter((device) => device.media === 'video' && device.extra!.match(/bcm2835[-_]v4l2/) !== null);

	return devices;
}

const report = (props: WizardProps, settings: S.Settings): WizardChange => {
	return { type: S.id, settings, inputs: S.func.createInputs(settings), ready: true };
};

const change = (props: WizardProps): WizardChange => report(props, initSettings(props.settings, props.knownDevices ?? []));

const update = (props: WizardProps, what: string, value?: unknown): WizardChange => {
	const settings = initSettings(props.settings, props.knownDevices ?? []);

	if (what in settings) {
		settings[what] = value;
	}

	return report(props, settings);
};

const id = 'raspicam';
const type = 'raspicam';
const name = 'Raspberry Pi camera';
const capabilities: SourceCapability[] = ['video'];
const icon = 'i-lucide-camera';

export { id, type, name, capabilities, icon, initSettings, initDevices, change, update };
