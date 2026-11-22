// Ported from legacy/src/views/Edit/Sources/NoAudio.js
import type { SourceCapability, SourceInput } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */

// This is a pseudo audio source for selecting no audio

export type Settings = Record<string, any>;

const initSettings = (initialSettings?: any): Settings => {
	if (!initialSettings) {
		initialSettings = {};
	}

	const settings = {
		...initialSettings,
	};

	return settings;
};

const createInputs = (_settings?: any): SourceInput[] => {
	const input: SourceInput = {
		address: '',
		options: [],
	};

	return [input];
};

const id = 'noaudio';
const name = 'No audio';
const capabilities: SourceCapability[] = ['audio'];
const ffversion = '^4.1.0 || ^5.0.0 || ^6.1.0';
const icon = 'i-lucide-ban';

const func = {
	initSettings,
	createInputs,
};

export { id, name, capabilities, ffversion, icon, func, initSettings, createInputs };
