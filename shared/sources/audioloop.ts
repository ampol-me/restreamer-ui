// Ported from legacy/src/views/Edit/Sources/AudioLoop.js
import type { UploadType } from './options';
import type { SourceCapability, SourceInput } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface Settings {
	address: string;
	mimetype: string;
	[key: string]: any;
}

/** The files the form accepts for upload. */
const acceptTypes: UploadType[] = [{ mimetype: 'audio/*', extension: 'audio', maxSize: 25 * 1024 * 1024 }];

/** Name under which the uploaded file is stored for the channel. */
const storeName = 'audioloop.source';

const initSettings = (initialSettings?: any): Settings => {
	if (!initialSettings) {
		initialSettings = {};
	}

	const settings = {
		address: '',
		mimetype: '',
		...initialSettings,
	};

	return settings;
};

const createInputs = (settings: any): SourceInput[] => {
	const address = '{diskfs}' + settings.address;
	const input: SourceInput = {
		address: address,
		options: [],
	};

	input.options.push('-stream_loop', '-1');
	input.options.push('-re');

	return [input];
};

const id = 'audioloop';
const name = 'Loop';
const capabilities: SourceCapability[] = ['audio'];
const ffversion = '^4.1.0 || ^5.0.0 || ^6.1.0';
const icon = 'i-lucide-refresh-cw';

const func = {
	initSettings,
	createInputs,
};

export { id, name, capabilities, ffversion, icon, func, initSettings, createInputs, acceptTypes, storeName };
