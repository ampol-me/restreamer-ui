// Ported from legacy/src/views/Edit/Sources/V4L.js
import type { SourceCapability, SourceInput } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface Settings {
	device: string;
	format: string;
	framerate: string;
	size: string;
	[key: string]: any;
}

const initSettings = (initialSettings?: any): Settings => {
	if (!initialSettings) {
		initialSettings = {};
	}

	const settings = {
		device: 'none',
		format: 'nv12',
		framerate: '25',
		size: '1280x720',
		...initialSettings,
	};

	return settings;
};

// The address of the 'custom' and 'none' devices is settings.deviceCustom, which no legacy form ever sets:
// the custom device field writes into settings.device.
const createInputs = (settings: any): SourceInput[] => {
	const address = settings.device === 'custom' || settings.device === 'none' ? settings.deviceCustom : settings.device;
	const input: SourceInput = {
		address: address,
		options: [],
	};

	input.options.push('-thread_queue_size', '512');
	input.options.push('-re');
	input.options.push('-r', '' + settings.framerate);
	input.options.push('-f', 'video4linux2');
	input.options.push('-framerate', '' + settings.framerate);
	input.options.push('-video_size', settings.size);
	input.options.push('-input_format', settings.format);

	return [input];
};

const id = 'video4linux2';
const name = 'Hardware device';
const capabilities: SourceCapability[] = ['video'];
const ffversion = '^4.1.0 || ^5.0.0 || ^6.1.0';
const icon = 'i-lucide-usb';

const func = {
	initSettings,
	createInputs,
};

export { id, name, capabilities, ffversion, icon, func, initSettings, createInputs };
