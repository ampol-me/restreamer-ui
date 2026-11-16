// Ported from legacy/src/views/Edit/Sources/AVFoundation.js
import type { SourceCapability, SourceInput } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface Settings {
	aindex: string;
	vindex: string;
	format: string;
	framerate: string | number;
	size: string;
	cursor: boolean;
	clicks: boolean;
	[key: string]: any;
}

const initSettings = (initialSettings?: any): Settings => {
	if (!initialSettings) {
		initialSettings = {};
	}

	const settings = {
		aindex: 'default',
		vindex: 'default',
		format: 'nv12',
		framerate: '25',
		size: 'auto',
		cursor: false,
		clicks: false,
		...initialSettings,
	};

	return settings;
};

const createInputs = (settings: any): SourceInput[] => {
	const vindex = settings.vindex;
	const aindex = settings.aindex;

	const address = `${vindex}:${aindex}`;
	const input: SourceInput = {
		address: address,
		options: [],
	};

	input.options.push('-f', 'avfoundation');

	if (parseInt(settings.framerate) !== 0) {
		input.options.push('-framerate', '' + settings.framerate);
	}

	if (settings.format.length !== 0) {
		input.options.push('-pixel_format', settings.format);
	}

	if (settings.size.length !== 0 && settings.size !== 'auto') {
		input.options.push('-video_size', settings.size);
	}

	if (settings.cursor) {
		input.options.push('-capture_cursor');
	}

	if (settings.clicks) {
		input.options.push('-capture_mouse_clicks');
	}

	return [input];
};

const id = 'avfoundation';
const name = 'AVFoundation';
const capabilities: SourceCapability[] = ['audio', 'video'];
const ffversion = '^4.1.0 || ^5.0.0 || ^6.1.0';
const icon = 'i-lucide-apple';

const func = {
	initSettings,
	createInputs,
};

export { id, name, capabilities, ffversion, icon, func, initSettings, createInputs };
