// Ported from legacy/src/views/Edit/Sources/VirtualAudio.js
import type { SourceCapability, SourceInput } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface Settings {
	source: string;
	layout: string;
	sampling: string;
	color: string;
	frequency: number | string;
	beepfactor: number | string;
	amplitude: number | string;
	[key: string]: any;
}

const initSettings = (initialSettings?: any): Settings => {
	if (!initialSettings) {
		initialSettings = {};
	}

	const settings = {
		source: 'silence',
		layout: 'stereo',
		sampling: '44100',
		color: 'white',
		frequency: 440,
		beepfactor: 4,
		amplitude: 1.0,
		...initialSettings,
	};

	return settings;
};

const createInputs = (settings: any): SourceInput[] => {
	const inputs: SourceInput[] = [];

	let address = '';

	switch (settings.source) {
		case 'silence':
			address = `anullsrc=r=${settings.sampling}:cl=${settings.layout}`;
			break;
		case 'noise':
			address = `anoisesrc=r=${settings.sampling}:color=${settings.color}:amplitude=${settings.amplitude}`;
			break;
		case 'sine':
			address = `sine=r=${settings.sampling}:frequency=${settings.frequency}:beep_factor=${settings.beepfactor}`;
			break;
		default:
			break;
	}

	if (address.length !== 0) {
		inputs.push({
			address: address,
			options: ['-f', 'lavfi'],
		});
	}

	return inputs;
};

const id = 'virtualaudio';
const name = 'Virtual source';
const capabilities: SourceCapability[] = ['audio'];
const ffversion = '^4.1.0 || ^5.0.0 || ^6.1.0';
const icon = 'i-lucide-waypoints';

const func = {
	initSettings,
	createInputs,
};

export { id, name, capabilities, ffversion, icon, func, initSettings, createInputs };
