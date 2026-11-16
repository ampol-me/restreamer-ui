// Ported from legacy/src/views/Edit/Sources/VirtualVideo.js
import type { SourceCapability, SourceInput } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface Settings {
	source: string;
	fps: string;
	size: string;
	rule: string;
	scale: string;
	ratio: string;
	mold: string;
	death_color: string;
	life_color: string;
	flags: string;
	[key: string]: any;
}

const initSettings = (initialSettings?: any): Settings => {
	if (!initialSettings) {
		initialSettings = {};
	}

	const settings = {
		source: 'none',
		fps: '25',
		size: '1920x1080',
		rule: 'S23/B3',
		scale: '1920x1080',
		ratio: '2/3',
		mold: '10',
		death_color: '#383838',
		life_color: '#FCEE21',
		flags: 'fast_bilinear',
		...initialSettings,
	};

	return settings;
};

const createInputs = (settings: any): SourceInput[] => {
	const inputs: SourceInput[] = [];

	let address = '';

	switch (settings.source) {
		case 'testsrc':
			address = `testsrc=rate=${settings.fps}:size=${settings.size}`;
			break;
		case 'testsrc2':
			address = `testsrc2=rate=${settings.fps}:size=${settings.size}`;
			break;
		case 'pal75bars':
			address = `pal75bars=rate=${settings.fps}:size=${settings.size}`;
			break;
		case 'pal100bars':
			address = `pal100bars=rate=${settings.fps}:size=${settings.size}`;
			break;
		case 'rgbtestsrc':
			address = `rgbtestsrc=rate=${settings.fps}:size=${settings.size}`;
			break;
		case 'smptebars':
			address = `smptebars=rate=${settings.fps}:size=${settings.size}`;
			break;
		case 'smptehdbars':
			address = `smptehdbars=rate=${settings.fps}:size=${settings.size}`;
			break;
		case 'yuvtestsrc':
			address = `yuvtestsrc=rate=${settings.fps}:size=${settings.size}`;
			break;
		case 'life':
			address = `life=rate=${settings.fps}:size=${settings.size}:rule=${settings.rule}:ratio=${settings.ratio}:mold=${settings.mold}:death_color=${settings.death_color}:life_color=${settings.life_color}`;
			if (settings.scale !== settings.size) {
				address += `,scale=${settings.scale}:flags=${settings.flags}`;
			}
			break;
		default:
			break;
	}

	if (address.length !== 0) {
		inputs.push({
			address: address,
			options: ['-f', 'lavfi', '-re'],
		});
	}

	return inputs;
};

const id = 'virtualvideo';
const name = 'Virtual source';
const capabilities: SourceCapability[] = ['video'];
const ffversion = '^4.1.0 || ^5.0.0 || ^6.1.0';
const icon = 'i-lucide-waypoints';

const func = {
	initSettings,
	createInputs,
};

export { id, name, capabilities, ffversion, icon, func, initSettings, createInputs };
