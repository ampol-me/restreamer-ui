// Ported from legacy/src/views/Edit/Sources/Framebuffer.js
import type { SourceCapability, SourceInput } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface Settings {
	device: string;
	framerate: string;
	[key: string]: any;
}

const initSettings = (initialSettings?: any): Settings => {
	if (!initialSettings) {
		initialSettings = {};
	}

	const settings = {
		device: 'none',
		framerate: '25',
		...initialSettings,
	};

	return settings;
};

const createInputs = (settings: any): SourceInput[] => {
	const address = settings.device === 'custom' || settings.device === 'none' ? settings.deviceCustom : settings.device;
	const input: SourceInput = {
		address: address,
		options: [],
	};

	input.options.push('-f', 'fbdev');
	input.options.push('-framerate', '' + settings.framerate);

	return [input];
};

const id = 'fbdev';
const name = 'Framebuffer';
const capabilities: SourceCapability[] = ['video'];
const ffversion = '^4.1.0 || ^5.0.0 || ^6.1.0';
const icon = 'i-lucide-images';

const func = {
	initSettings,
	createInputs,
};

export { id, name, capabilities, ffversion, icon, func, initSettings, createInputs };
