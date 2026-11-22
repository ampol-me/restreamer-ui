// Ported from legacy/src/views/Publication/Services/Framebuffer.js
import type { Service, ServiceContext, ServiceOutput } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface Settings {
	device: string;
	pix_fmt: string;
}

function init(settings: Record<string, any> = {}): Settings {
	const initSettings = {
		device: 'none',
		pix_fmt: 'bgra',
		...settings,
	};
	return initSettings as Settings;
}

function createOutput(settings: Settings, _ctx: ServiceContext): ServiceOutput[] {
	const outputs = [];
	outputs.push({
		address: settings.device,
		options: ['-pix_fmt', settings.pix_fmt, '-f', 'fbdev'],
	});
	return outputs;
}

const service: Service<Settings> = {
	id: 'framebuffer',
	name: 'Framebuffer',
	version: '1.0',
	stream_key_link: '',
	category: 'universal',
	requires: { codecs: { audio: ['none'], video: ['rawvideo'] }, formats: ['fbdev'], devices: ['fbdev'] },
	author: { creator: { name: 'datarhei', link: 'https://github.com/datarhei' }, maintainer: { name: 'datarhei', link: 'https://github.com/datarhei' } },
	description: 'Send video to Framebuffer',
	image_copyright: '',
	icon: { type: 'fontawesome-solid', name: 'faImages', color: 'rgba(57, 181, 74, 1)' },
	init,
	createOutput,
	fields: [
		{
			key: 'device',
			type: 'select',
			label: 'Device',
			// Legacy builds the options from skills.devices.fbdev (legacy SelectCustom).
			options: (_settings, ctx) => {
				const filteredDevices = ctx.skills.devices.fbdev.filter((device: any) => device.extra !== '');
				const options = filteredDevices.map((device: any) => {
					return {
						value: device.id,
						label: device.name + ' (' + device.extra + ')',
					};
				});
				options.unshift({
					value: 'none',
					label: `Choose an output device ...`,
					disabled: true,
				});
				return options;
			},
		},
		{
			key: 'pix_fmt',
			type: 'select',
			label: 'Pixel format',
			options: [
				{ value: 'rgba', label: 'RGBA' },
				{ value: 'bgra', label: 'BGRA' },
				{ value: 'argb', label: 'ARGB' },
				{ value: 'abgr', label: 'ABGR' },
				{ value: 'rgb24', label: 'RGB24' },
				{ value: 'bgr24', label: 'BGR24' },
				{ value: 'rgb565le', label: 'RGB565 Little Endian' },
				{ value: 'rgb565be', label: 'RGB565 Big Endian' },
			],
		},
	],
};

export default service;
