// Ported from legacy/src/views/Publication/Services/Dummy.js
import type { Service, ServiceContext, ServiceOutput } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface Settings {
	stream_key: string;
	rtmp_primary: boolean;
	rtmp_backup: boolean;
}

// Initialize the settings, i.e. set defaults for fields that are not defined
function init(settings: Record<string, any> = {}): Settings {
	const initSettings = {
		stream_key: '',
		rtmp_primary: true,
		rtmp_backup: false,
		...settings,
	};
	return initSettings as Settings;
}

// createOutput creates the FFmpeg output options based on the settings,
// skills, metadata, and/or streams. It returns an array of arrays of options
// for each output.
//
// This function should be exported, such that it can be called from the
// outside in case e.g. the streams changed (due to changes in the encoding
// settings) and the output options depend on that information.

// createOutput creates the FFmpeg output options based on the settings,
// skills, metadata, and/or streams. It returns an array of arrays of options
// for each output.
//
// This function should be exported, such that it can be called from the
// outside in case e.g. the streams changed (due to changes in the encoding
// settings) and the output options depend on that information.
function createOutputs(settings: Record<string, any>, _skills: any, _metadata: any, _streams: any[]): ServiceOutput[] {
	settings = init(settings);
	const outputs: ServiceOutput[] = [];
	if (settings.stream_key.length === 0) {
		return outputs;
	}
	if (settings.rtmp_primary) {
		outputs.push({
			address: 'rtmp://a.rtmp.youtube.com/live2/' + settings.stream_key,
			options: ['-codec', 'copy', '-f', 'flv'],
		});
	}
	if (settings.rtmp_backup) {
		outputs.push({
			address: 'rtmp://b.rtmp.youtube.com/live2?backup=1/' + settings.stream_key,
			options: ['-codec', 'copy', '-f', 'flv'],
		});
	}
	return outputs;
}

// Service is a React component that implements a service.
//
// A service receives these props:
//
//   - settings: object
//   - skills: object
//   - metadata: object
//   - onChange: function
//
// The contents of the 'settings' object are completely up to the
// service. It holds all settings for this service. The state of the
// settings is managed by the parent React component.
//
// The 'skills' object has information about the available protocols,
// formats, and codecs based on your requirements. It has to form:
//
//   {
//      protocols: array of available protocols
//      formats: array of available formats
//      codecs: {
//         audio: {
//            [codec]: array of available coders,
//            ...
//         },
//         video: {
//            [codec]: array of available coders,
//            ...
//         },
//      }
//   }
//
// The 'protocols' array lists all the protocols from your requirments
// that are actually available. The array is empty if you don't have any
// protocol requirements.
//
// The 'formats' array lists all the formats from your requirements that
// are actually available. The array is empty if you don't have any format
// requirements.
//
// The 'codecs' object holds an 'audio' and a 'video' object. These objects
// have the available codecs from the requirements as fields. Each codec
// has a list of available coders. For example for the codec 'h264' there
// are the coders 'libx264' and 'h264_nvenc' available where the service
// or user has to choose from. This depends on with which libraries ffmpeg
// has been compiled with.
//
// The 'metadata' object holds metadata about the stream that this
// service will process. It has this layout:
//
//   {
//      name: string,
//      description: string,
//      license: string,
//   }
//
// The 'onChange' has the signature
//
//   function(outputs: array, settings: object)
//
// It has to be called whenever there are changes (i.e. user input) of
// the settings. 'outputs' is an array of output definitions for ffmpeg
// of the form:
//
//   {
//      address: string,
//      options: array,
//   }
//
// Each output requires an address and a list of options. These options
// are the ffmpeg command line options that are necessary for this service
// and are based on the settings. The parent React component is not
// aware of the internals of this service.
//
// 'settings' is the settings object where you store the settings for the
// service. Its state is managed by the parent React component.

function createOutput(settings: Settings, ctx: ServiceContext): ServiceOutput[] {
	return createOutputs(settings, ctx.skills, ctx.metadata, ctx.streams);
}

const service: Service<Settings> = {
	id: 'dummy',
	name: 'Dummy Live',
	version: '1.0',
	stream_key_link: '',
	category: 'platform',
	requires: { protocols: ['dummy'], formats: ['flv'] },
	author: { creator: { name: 'datarhei', link: 'https://github.com/datarhei' }, maintainer: { name: 'datarhei', link: 'https://github.com/datarhei' } },
	description: 'This is a dummy service that explains to you the concepts of service.',
	image_copyright: 'This is to mention the copyright regulations for the target of this service.',
	icon: { type: 'mui', name: 'Extension', color: '#FFFFFF' },
	init,
	createOutput,
	fields: [
		{ key: 'stream_key', type: 'text', label: 'Stream key' },
		{ key: 'rtmp_primary', type: 'checkbox', label: 'Enable primary stream' },
		{ key: 'rtmp_backup', type: 'checkbox', label: 'Enable backup stream' },
	],
};

export default service;
