// Ported from legacy/src/views/Edit/Sources/ALSA.js
import type { SourceCapability, SourceInput } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface Settings {
	address: string;
	device: string;
	sampling: string;
	channels: string;
	delay: number | string;
	[key: string]: any;
}

const initSettings = (initialSettings?: any): Settings => {
	if (!initialSettings) {
		initialSettings = {};
	}

	const settings = {
		address: 'hw:1,0',
		device: '1,0',
		sampling: '44100',
		channels: '1',
		delay: 0,
		...initialSettings,
	};

	return settings;
};

const createInputs = (settings: any): SourceInput[] => {
	const address = `hw:${settings.device}`;

	const input: SourceInput = {
		address: address,
		options: [],
	};

	input.options.push('-f', 'alsa');
	input.options.push('-thread_queue_size', '512');
	input.options.push('-channels', '' + settings.channels);
	input.options.push('-sample_rate', '' + settings.sampling);

	if (settings.delay !== 0) {
		input.options.push('-itsoffset', settings.delay + 'ms');
	}

	return [input];
};

const id = 'alsa';
const name = 'ALSA';
const capabilities: SourceCapability[] = ['audio'];
const ffversion = '^4.1.0 || ^5.0.0 || ^6.1.0';
const icon = 'i-lucide-usb';

const func = {
	initSettings,
	createInputs,
};

export { id, name, capabilities, ffversion, icon, func, initSettings, createInputs };
