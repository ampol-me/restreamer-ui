// @ts-nocheck
// Deterministic inputs for the metadata parity test.
//
// `runCases(M)` calls every export of a metadata module (the legacy JS module when generating
// the golden fixtures, the TS port when testing) with the same inputs and records, per case,
// the return value and the arguments after the call (several functions mutate their arguments).

const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));

// ---------------------------------------------------------------------------
// Streams
// ---------------------------------------------------------------------------

const vstream = (codec, stream = 0, extra = {}) => ({
	url: 'rtmp://localhost/live/stream',
	format: 'flv',
	index: 0,
	stream: stream,
	type: 'video',
	codec: codec,
	coder: codec,
	bitrate_kbps: 4000,
	duration_sec: 0,
	fps: 25,
	pix_fmt: 'yuv420p',
	width: 1920,
	height: 1080,
	sampling_hz: 0,
	layout: '',
	channels: 0,
	...extra,
});

const astream = (codec, stream = 1, extra = {}) => ({
	url: 'rtmp://localhost/live/stream',
	format: 'flv',
	index: 0,
	stream: stream,
	type: 'audio',
	codec: codec,
	coder: codec,
	bitrate_kbps: 128,
	duration_sec: 0,
	fps: 0,
	pix_fmt: '',
	width: 0,
	height: 0,
	sampling_hz: 48000,
	layout: 'stereo',
	channels: 2,
	...extra,
});

const streamLists = {
	h264_aac: [vstream('h264'), astream('aac')],
	hevc_aac: [vstream('hevc'), astream('aac')],
	av1_opus: [vstream('av1'), astream('opus')],
	h264_mp3: [vstream('h264'), astream('mp3')],
	video_only: [vstream('h264')],
	video_only_hevc: [vstream('hevc')],
	audio_only: [astream('aac', 0)],
	audio_only_opus: [astream('opus', 0)],
	audio_first: [astream('opus', 0), vstream('hevc', 1), astream('aac', 2), vstream('h264', 3)],
	data_only: [{ ...vstream('bin_data'), type: 'data' }],
	empty: [],
};

const encoderSets = {
	all: {
		audio: ['copy', 'none', 'aac', 'aac_at', 'libmp3lame', 'opus', 'libopus', 'vorbis', 'libvorbis'],
		video: ['copy', 'none', 'libx264', 'h264_videotoolbox', 'h264_nvenc', 'h264_omx', 'h264_v4l2m2m', 'h264_vaapi', 'libx265', 'libvpx-vp9', 'rawvideo'],
	},
	software: { audio: ['copy', 'none', 'aac', 'libmp3lame'], video: ['copy', 'none', 'libx264'] },
	nvenc_mp3: { audio: ['copy', 'none', 'libmp3lame'], video: ['copy', 'none', 'h264_nvenc'] },
	no_h264: { audio: ['copy', 'none', 'libopus'], video: ['copy', 'none', 'libx265', 'libvpx-vp9'] },
	none: { audio: [], video: [] },
};

// ---------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------

const networkSource = (streams, extra = {}) => ({
	type: 'network',
	settings: { mode: 'pull', address: 'rtmp://localhost/live/stream' },
	inputs: [{ address: 'rtmp://localhost/live/stream', options: ['-fflags', '+genpts', '-thread_queue_size', '512'] }],
	streams: clone(streams),
	...extra,
});

const virtualAudioSource = () => ({
	type: 'virtualaudio',
	settings: { source: 'silence', layout: 'stereo', sampling: 44100 },
	inputs: [{ address: 'anullsrc=r=44100:cl=stereo', options: ['-f', 'lavfi'] }],
	streams: [
		{
			url: 'anullsrc=r=44100:cl=stereo',
			format: 'lavfi',
			index: 0,
			stream: 0,
			type: 'audio',
			codec: 'pcm_u8',
			coder: 'pcm_u8',
			bitrate_kbps: 705,
			sampling_hz: 44100,
			layout: 'stereo',
			channels: 2,
		},
	],
});

// A source with two inputs; the second input carries the audio stream.
const twoInputSource = () => ({
	type: 'network',
	settings: {},
	inputs: [
		{ address: 'rtsp://camera/video', options: ['-rtsp_transport', 'tcp'] },
		{ address: 'rtsp://camera/audio', options: [] },
	],
	streams: [vstream('h264', 0, { url: 'rtsp://camera/video', index: 0 }), astream('pcm_alaw', 0, { url: 'rtsp://camera/audio', index: 1 })],
});

// ---------------------------------------------------------------------------
// Profiles
// ---------------------------------------------------------------------------

const videoCopy = (source = 0, stream = 0) => ({
	source: source,
	stream: stream,
	encoder: { coder: 'copy', codec: 'h264', settings: {}, mapping: { global: [], local: ['-codec:v', 'copy'], filter: [] } },
	decoder: { coder: 'default', settings: {}, mapping: { global: [], local: [], filter: [] } },
	filter: { graph: '', settings: {} },
});

const videoX264 = (source = 0, stream = 0, extra = {}) => ({
	source: source,
	stream: stream,
	encoder: {
		coder: 'libx264',
		codec: 'h264',
		settings: { preset: 'ultrafast', bitrate: '4096', fps: '25', gop: '2', profile: 'auto', tune: 'zerolatency' },
		mapping: {
			global: [],
			local: ['-codec:v', 'libx264', '-preset:v', 'ultrafast', '-b:v', '4096k', '-maxrate:v', '4096k', '-bufsize:v', '4096k', '-r', '25', '-g', '50'],
			filter: [],
		},
	},
	decoder: { coder: 'default', settings: {}, mapping: { global: [], local: [], filter: [] } },
	filter: { graph: '', settings: {} },
	...extra,
});

const videoVAAPI = (source = 0, stream = 0, extra = {}) => ({
	source: source,
	stream: stream,
	encoder: {
		coder: 'h264_vaapi',
		codec: 'h264',
		settings: { bitrate: '4096', fps: '25', gop: '2', profile: 'auto' },
		mapping: {
			global: [['-vaapi_device', '/dev/dri/renderD128']],
			local: ['-codec:v', 'h264_vaapi', '-b:v', '4096k', '-r', '25', '-g', '50'],
			filter: ['format=nv12', 'hwupload'],
		},
	},
	decoder: { coder: 'default', settings: {}, mapping: { global: [], local: [], filter: [] } },
	filter: { graph: '', settings: {} },
	...extra,
});

const scaleFilter = () => ({
	graph: 'scale=-1:720,fps=25',
	settings: {
		scale: { graph: 'scale=-1:720', settings: { mode: 'height', fix: '1280:720', width: '1280', height: '720' } },
		framerate: { graph: 'fps=25', settings: { fps: '25' } },
	},
});

const cuvidDecoder = () => ({
	coder: 'h264_cuvid',
	settings: {},
	mapping: { global: [['-hwaccel', 'cuda']], local: ['-c:v', 'h264_cuvid'], filter: [] },
});

const audioCopy = (source = 0, stream = 1) => ({
	source: source,
	stream: stream,
	encoder: { coder: 'copy', codec: 'aac', settings: {}, mapping: { global: [], local: ['-codec:a', 'copy'], filter: [] } },
	decoder: { coder: 'default', settings: {}, mapping: { global: [], local: [], filter: [] } },
	filter: { graph: '', settings: {} },
});

const audioAAC = (source = 0, stream = 1, extra = {}) => ({
	source: source,
	stream: stream,
	encoder: {
		coder: 'aac',
		codec: 'aac',
		settings: { bitrate: '64' },
		mapping: { global: [], local: ['-codec:a', 'aac', '-b:a', '64k', '-shortest'], filter: [] },
	},
	decoder: { coder: 'default', settings: {}, mapping: { global: [], local: [], filter: [] } },
	filter: { graph: '', settings: {} },
	...extra,
});

const audioMP3 = (source = 0, stream = 1, extra = {}) => ({
	source: source,
	stream: stream,
	encoder: {
		coder: 'libmp3lame',
		codec: 'mp3',
		settings: { bitrate: '64' },
		mapping: { global: [['-vsync', 'drop']], local: ['-codec:a', 'libmp3lame', '-b:a', '64k', '-shortest'], filter: ['aresample=async=1'] },
	},
	decoder: { coder: 'default', settings: {}, mapping: { global: [], local: [], filter: [] } },
	filter: { graph: '', settings: {} },
	...extra,
});

const resampleFilter = () => ({
	graph: 'aresample=osr=44100:ochl=stereo',
	settings: {
		aresample: { graph: 'aresample=osr=44100:ochl=stereo', settings: { channels: '2', layout: 'stereo', sampling: '44100' } },
	},
});

const audioNone = () => ({
	source: -1,
	stream: -1,
	encoder: { coder: 'none', settings: {}, mapping: { global: [], local: [], filter: [] } },
	decoder: { coder: 'default', settings: {}, mapping: { global: [], local: [], filter: [] } },
	filter: { graph: '', settings: {} },
});

const profile = (video, audio, custom) => {
	const p = { video: video, audio: audio };
	if (custom) {
		p.custom = custom;
	}
	return p;
};

// Named scenarios shared by validateProfile, createInputsOutputs and createOutputStreams.
// Each entry is a factory so that every call gets fresh (unshared) objects.
const scenarios = {
	copy_copy: () => ({
		sources: [networkSource(streamLists.h264_aac)],
		profiles: [profile(videoCopy(), audioCopy())],
	}),
	copy_video_only: () => ({
		sources: [networkSource(streamLists.video_only)],
		profiles: [profile(videoCopy(), audioNone())],
	}),
	copy_audio_coder_none_with_stream: () => ({
		sources: [networkSource(streamLists.h264_aac)],
		profiles: [profile(videoCopy(), { ...audioNone(), source: 0, stream: 1 })],
	}),
	encode_no_filter: () => ({
		sources: [networkSource(streamLists.hevc_aac)],
		profiles: [profile(videoX264(), audioAAC())],
	}),
	encode_with_filters: () => ({
		sources: [networkSource(streamLists.av1_opus)],
		profiles: [profile(videoX264(0, 0, { filter: scaleFilter() }), audioAAC(0, 1, { filter: resampleFilter() }))],
	}),
	encode_coder_filter_only: () => ({
		sources: [networkSource(streamLists.av1_opus)],
		profiles: [profile(videoVAAPI(), audioMP3())],
	}),
	encode_user_and_coder_filters: () => ({
		sources: [networkSource(streamLists.av1_opus)],
		profiles: [profile(videoVAAPI(0, 0, { filter: scaleFilter() }), audioMP3(0, 1, { filter: resampleFilter() }))],
	}),
	copy_ignores_filters: () => ({
		sources: [networkSource(streamLists.h264_aac)],
		profiles: [profile({ ...videoCopy(), filter: scaleFilter() }, { ...audioCopy(), filter: resampleFilter() })],
	}),
	encode_with_decoder: () => ({
		sources: [networkSource(streamLists.h264_aac)],
		profiles: [profile(videoX264(0, 0, { decoder: cuvidDecoder() }), audioAAC())],
	}),
	separate_audio_source: () => ({
		sources: [networkSource(streamLists.video_only), virtualAudioSource()],
		profiles: [profile(videoCopy(), audioAAC(1, 0, { filter: resampleFilter() }), { selected: true, stream: -2 })],
	}),
	separate_audio_source_encode_video: () => ({
		sources: [networkSource(streamLists.hevc_aac), virtualAudioSource()],
		profiles: [profile(videoX264(0, 0, { filter: scaleFilter(), decoder: cuvidDecoder() }), audioMP3(1, 0, { filter: resampleFilter() }))],
	}),
	two_inputs_one_source: () => ({
		sources: [twoInputSource()],
		profiles: [profile(videoCopy(), audioAAC(0, 1))],
	}),
	multiple_profiles: () => ({
		sources: [networkSource(streamLists.h264_aac), virtualAudioSource()],
		profiles: [
			profile(videoCopy(), audioCopy()),
			profile(videoVAAPI(0, 0, { filter: scaleFilter() }), audioMP3(1, 0)),
			profile(videoVAAPI(), audioMP3(0, 1)),
			// incomplete, is skipped
			profile({ ...videoCopy(), stream: -1 }, audioCopy()),
		],
	}),
	audio_only_profile: () => ({
		sources: [networkSource(streamLists.audio_only)],
		profiles: [
			profile(
				{ ...videoCopy(), source: -1, stream: -1, encoder: { coder: 'none', settings: {}, mapping: { global: [], local: [], filter: [] } } },
				audioCopy(0, 0),
			),
		],
	}),
	video_coder_none: () => ({
		sources: [networkSource(streamLists.h264_aac)],
		profiles: [profile({ ...videoCopy(), encoder: { coder: 'none', settings: {}, mapping: { global: [], local: [], filter: [] } } }, audioCopy())],
	}),
	video_source_out_of_range: () => ({
		sources: [networkSource(streamLists.h264_aac)],
		profiles: [profile(videoCopy(3, 0), audioCopy())],
	}),
	video_stream_out_of_range: () => ({
		sources: [networkSource(streamLists.h264_aac)],
		profiles: [profile(videoCopy(0, 7), audioCopy())],
	}),
	video_points_to_audio_stream: () => ({
		sources: [networkSource(streamLists.h264_aac)],
		profiles: [profile(videoCopy(0, 1), audioCopy(0, 0))],
	}),
	stream_index_without_input: () => ({
		sources: [networkSource([vstream('h264', 0, { index: 2 }), astream('aac', 1, { index: 2 })])],
		profiles: [profile(videoCopy(), audioCopy())],
	}),
	audio_source_out_of_range: () => ({
		sources: [networkSource(streamLists.h264_aac)],
		profiles: [profile(videoCopy(), audioCopy(4, 0))],
	}),
	audio_stream_out_of_range: () => ({
		sources: [networkSource(streamLists.h264_aac)],
		profiles: [profile(videoCopy(), audioCopy(0, 9))],
	}),
	unknown_coders: () => ({
		sources: [networkSource(streamLists.h264_aac)],
		profiles: [
			profile(
				{
					...videoX264(),
					encoder: { coder: 'does_not_exist', settings: {}, mapping: { global: [], local: ['-codec:v', 'does_not_exist'], filter: [] } },
				},
				{
					...audioAAC(),
					encoder: { coder: 'does_not_exist', settings: {}, mapping: { global: [], local: ['-codec:a', 'does_not_exist'], filter: [] } },
				},
			),
		],
	}),
	uninitialized_profile: () => ({
		sources: [networkSource(streamLists.h264_aac)],
		profiles: [{}],
	}),
	partial_profile: () => ({
		sources: [networkSource(streamLists.h264_aac)],
		profiles: [{ video: { source: 0, stream: 0, encoder: { coder: 'copy', mapping: ['-codec:v', 'copy'] } }, audio: { source: 0, stream: 1 } }],
	}),
	no_sources: () => ({
		sources: [],
		profiles: [profile(videoCopy(), audioCopy())],
	}),
	no_profiles: () => ({
		sources: [networkSource(streamLists.h264_aac)],
		profiles: [],
	}),
};

// ---------------------------------------------------------------------------
// Metadata objects
// ---------------------------------------------------------------------------

const legacyAudioEncoder = (coder, settings) => ({
	coder: coder,
	codec: coder === 'libmp3lame' ? 'mp3' : coder,
	settings: settings,
	mapping: ['-codec:a', coder, '-b:a', '64k'],
});

const ingestOld = (version) => {
	const m = {
		meta: { name: 'Livestream 1', author: { name: 'datarhei' } },
		player: { autoplay: true, mute: true },
		sources: [networkSource(streamLists.h264_aac), virtualAudioSource()],
		profiles: [
			{
				video: {
					source: 0,
					stream: 0,
					encoder: { coder: 'copy', codec: 'h264', settings: {}, mapping: ['-codec:v', 'copy'] },
					decoder: { coder: 'default', settings: {}, mapping: [] },
				},
				audio: { source: 1, stream: 0, encoder: legacyAudioEncoder('aac', { bitrate: '64', channels: '2', layout: 'stereo', sampling: '44100' }) },
			},
			{
				video: {
					source: 0,
					stream: 0,
					encoder: { coder: 'libx264', codec: 'h264', settings: { preset: 'ultrafast', bitrate: '4096' }, mapping: ['-codec:v', 'libx264'] },
					decoder: { coder: 'h264_cuvid', settings: {}, mapping: ['-c:v', 'h264_cuvid'] },
				},
				audio: {
					source: 0,
					stream: 1,
					encoder: legacyAudioEncoder('libmp3lame', { bitrate: '128', channels: '1', layout: 'mono', sampling: '48000' }),
				},
			},
			{
				video: { source: 0, stream: 0, encoder: { coder: 'copy', codec: 'h264', settings: {}, mapping: ['-codec:v', 'copy'] } },
				audio: { source: 0, stream: 1, encoder: { coder: 'copy', codec: 'aac', settings: {}, mapping: ['-codec:a', 'copy'] } },
			},
			{
				video: { source: 0, stream: 0, encoder: { coder: 'copy', codec: 'h264', settings: {}, mapping: ['-codec:v', 'copy'] } },
				audio: { source: -1, stream: -1, encoder: { coder: 'none', settings: {}, mapping: [] } },
			},
			{
				video: { source: 0, stream: 0 },
				audio: {
					source: 0,
					stream: 1,
					encoder: legacyAudioEncoder('opus', { bitrate: '64', channels: 'inherit', layout: 'inherit', sampling: 'inherit' }),
				},
			},
			{
				video: { source: 0, stream: 0 },
				audio: { source: 0, stream: 1, encoder: legacyAudioEncoder('aac', { bitrate: '64' }) },
			},
		],
		streams: [
			{ index: 0, stream: 0, type: 'video', codec: 'h264', width: 1920, height: 1080 },
			{ index: 0, stream: 1, type: 'audio', codec: 'aac', sampling_hz: 44100, layout: 'stereo', channels: 2 },
		],
		control: {
			hls: { segmentDuration: 4, listSize: 10 },
			process: { autostart: false, delay: 30 },
			snapshot: { interval: 120 },
			rtmp: { enable: true },
			limits: { cpu_usage: 50 },
		},
		license: 'CC0 1.0',
	};

	if (version !== undefined) {
		m.version = version;
	}

	return m;
};

const egressFull = (version) => {
	const m = {
		name: 'YouTube',
		control: {
			process: { autostart: true, delay: 5 },
			source: { source: 'rtmp' },
			limits: { cpu_usage: 10 },
		},
		outputs: [{ address: 'rtmp://a.rtmp.youtube.com/live2/key' }, { options: ['-f', 'flv'] }, null, {}],
		settings: { stream_key: 'key', mode: 'rtmps' },
		profiles: [profile(videoCopy(), audioCopy()), { video: { encoder: { coder: 'libx264', mapping: ['-codec:v', 'libx264'] } } }, null],
		streams: [{ type: 'video', codec: 'h264', width: 1280, height: 720 }, null, { type: 'audio', codec: 'aac', channels: 2, extra: 'kept' }],
	};

	if (version !== undefined) {
		m.version = version;
	}

	return m;
};

// ---------------------------------------------------------------------------
// Case list
// ---------------------------------------------------------------------------

const buildCases = () => {
	const cases = [];

	// add('group', 'name', 'exportName', () => [args])
	// `slim` cases only record the result (for large matrices where the result is the mutated argument).
	const add = (group, name, fn, args, slim = false) => {
		cases.push({ group: group, name: name, fn: fn, args: args, slim: slim });
	};

	// --- defaults ---------------------------------------------------------
	add('defaults', 'getDefaultMetadata', 'getDefaultMetadata', () => []);
	add('defaults', 'getDefaultIngestMetadata', 'getDefaultIngestMetadata', () => []);
	add('defaults', 'getDefaultEgressMetadata', 'getDefaultEgressMetadata', () => []);

	// --- initMetadata / mergeMetadata ------------------------------------
	for (const [name, value] of Object.entries({
		undefined: undefined,
		null: null,
		empty: {},
		partial: { playersite: { title: 'My Site', col: 3 } },
		full: { version: '1.14.0', playersite: { title: 'My Site' }, bundle: { name: 'foo' }, extra: { keep: true } },
		version_number_1: { version: 1, bundle: { a: 1 } },
		version_old: { version: '0.1.0', playersite: { a: 1 } },
		version_newer: { version: '99.0.0' },
		version_invalid: { version: 'not-a-version' },
		playersite_null: { playersite: null, bundle: null },
	})) {
		add('metadata', 'initMetadata/' + name, 'initMetadata', () => [clone(value)]);
		add('metadata', 'mergeMetadata/' + name, 'mergeMetadata', () => [clone(value)]);
	}
	add('metadata', 'mergeMetadata/with_base', 'mergeMetadata', () => [
		{ playersite: { title: 'New' }, bundle: { b: 2 } },
		{ version: '1.0.0', playersite: { title: 'Old', col: 2 }, bundle: { a: 1 }, fromBase: true },
	]);
	add('metadata', 'mergeMetadata/base_only', 'mergeMetadata', () => [null, { version: '1.0.0', playersite: { title: 'Old' }, bundle: {} }]);
	add('metadata', 'mergeMetadata/base_without_sections', 'mergeMetadata', () => [{ playersite: { a: 1 } }, { version: '1.14.0' }]);

	// --- initIngestMetadata / mergeIngestMetadata -------------------------
	const ingestInputs = {
		undefined: () => undefined,
		null: () => null,
		empty: () => ({}),
		partial_meta: () => ({ meta: { name: 'Stream' } }),
		partial_author: () => ({ meta: { author: { name: 'Jane' } }, license: 'CC BY-SA 4.0' }),
		partial_control: () => ({ control: { hls: { lhls: true, storage: 'diskfs' }, process: { low_delay: true }, snapshot: { enable: false } } }),
		partial_control_shallow_sections: () => ({ control: { rtmp: {}, srt: { enable: true }, limits: { memory_mbytes: 512 } } }),
		control_unknown_section: () => ({ control: { whip: { enable: true } }, unknown: [1, 2, 3] }),
		not_arrays: () => ({ sources: 'x', profiles: {}, streams: null }),
		empty_arrays: () => ({ sources: [], profiles: [], streams: [] }),
		array_items_empty: () => ({ sources: [{}, { type: 'network' }], profiles: [{}, null], streams: [{}, null] }),
		current_version: () => ingestOld('1.14.0'),
		no_version: () => ingestOld(),
		version_1_2_0: () => ingestOld('1.2.0'),
		version_1_1_0: () => ingestOld('1.1.0'),
		version_1_0_0: () => ingestOld('1.0.0'),
		version_number_1: () => ingestOld(1),
		version_0_9_0_beta: () => ingestOld('0.9.0-beta.1'),
		version_1_2_0_prerelease: () => ingestOld('1.2.0-rc.1'),
		version_newer: () => ingestOld('99.0.0'),
		old_version_default_profiles: () => ({ version: '1.0.0' }),
		old_version_empty_profile: () => ({ version: '1.0.0', profiles: [{}] }),
		old_version_no_audio_settings: () => ({ version: '1.1.0', profiles: [{ audio: { encoder: { coder: 'aac' } } }] }),
		old_version_existing_filter: () => ({
			version: '1.1.0',
			profiles: [
				{
					audio: {
						encoder: { coder: 'aac', settings: { bitrate: '64', channels: '2', layout: 'stereo', sampling: '44100' } },
						filter: { graph: 'volume=1', settings: { volume: {} } },
					},
				},
			],
		}),
		new_version_modern_profiles: () => ({
			version: '1.14.0',
			sources: [networkSource(streamLists.h264_aac), virtualAudioSource()],
			profiles: [profile(videoX264(0, 0, { filter: scaleFilter() }), audioAAC(1, 0, { filter: resampleFilter() }), { selected: true, stream: -2 })],
			streams: [vstream('h264'), astream('aac')],
		}),
		custom_derived_from_audio_source_1: () => ({
			version: '1.14.0',
			profiles: [
				{ audio: { source: 1, stream: 0 } },
				{ audio: { source: 0, stream: 3 } },
				{ audio: { source: 1, stream: 0 }, custom: { selected: false } },
			],
		}),
	};

	for (const [name, input] of Object.entries(ingestInputs)) {
		add('ingest', 'initIngestMetadata/' + name, 'initIngestMetadata', () => [input()]);
		add('ingest', 'mergeIngestMetadata/' + name, 'mergeIngestMetadata', () => [input()]);
	}

	add('ingest', 'initIngestMetadata/version_invalid_throws', 'initIngestMetadata', () => [{ version: 'not-a-version' }]);
	add('ingest', 'initIngestMetadata/old_version_source_null_throws', 'initIngestMetadata', () => [{ sources: [null] }]);

	const ingestBase = () => ({
		version: '1.14.0',
		sources: [networkSource(streamLists.video_only)],
		profiles: [profile(videoCopy(), audioNone())],
		streams: [vstream('h264')],
		control: {
			hls: { lhls: true, segmentDuration: 6, listSize: 3, cleanup: false, version: 7, storage: 'diskfs', master_playlist: false },
			rtmp: { enable: true },
			srt: { enable: true },
			process: { autostart: false, reconnect: false, delay: 1, staleTimeout: 2, low_delay: true },
			snapshot: { enable: false, interval: 5 },
			limits: { cpu_usage: 1, memory_mbytes: 2, waitfor_seconds: 3 },
		},
		player: { autoplay: true, logo: { image: 'x.png' } },
		meta: { name: 'Base', description: 'Base description', author: { name: 'Base author', description: 'Base author description' } },
		license: 'CC0 1.0',
		fromBase: true,
	});

	add('ingest', 'mergeIngestMetadata/with_base_empty', 'mergeIngestMetadata', () => [{}, ingestBase()]);
	add('ingest', 'mergeIngestMetadata/with_base_null', 'mergeIngestMetadata', () => [null, ingestBase()]);
	add('ingest', 'mergeIngestMetadata/with_base_partial', 'mergeIngestMetadata', () => [
		{
			meta: { name: 'New', author: { description: 'New author description' } },
			player: { mute: true },
			control: { hls: { listSize: 9 }, process: { delay: 9 }, snapshot: { interval: 9 }, limits: { cpu_usage: 9 } },
		},
		ingestBase(),
	]);
	add('ingest', 'mergeIngestMetadata/with_base_old_version', 'mergeIngestMetadata', () => [ingestOld('1.0.0'), ingestBase()]);
	add('ingest', 'mergeIngestMetadata/with_old_base', 'mergeIngestMetadata', () => [
		{ meta: { name: 'New' } },
		{ ...ingestOld('1.1.0'), control: ingestBase().control },
	]);

	// --- initEgressMetadata / mergeEgressMetadata -------------------------
	const egressInputs = {
		undefined: () => undefined,
		null: () => null,
		empty: () => ({}),
		partial_name: () => ({ name: 'Twitch' }),
		partial_control: () => ({ control: { process: { autostart: true }, source: { source: 'srt' } } }),
		partial_control_limits: () => ({ control: { limits: { cpu_usage: 20 } }, unknown: 'kept' }),
		not_arrays: () => ({ outputs: 'x', profiles: {}, streams: null }),
		empty_arrays: () => ({ outputs: [], profiles: [], streams: [] }),
		full_current_version: () => egressFull('1.14.0'),
		full_no_version: () => egressFull(),
		full_version_1_0_0: () => egressFull('1.0.0'),
		full_version_number_1: () => egressFull(1),
		full_version_newer: () => egressFull('99.0.0'),
		version_invalid: () => ({ version: 'not-a-version', name: 'x' }),
		legacy_output_field: () => ({ version: '1.2.0', name: 'foobar', output: { address: 'rtmp://example.com/live', options: [] } }),
	};

	for (const [name, input] of Object.entries(egressInputs)) {
		add('egress', 'initEgressMetadata/' + name, 'initEgressMetadata', () => [input()]);
		add('egress', 'mergeEgressMetadata/' + name, 'mergeEgressMetadata', () => [input()]);
	}

	const egressBase = () => ({
		version: '1.14.0',
		name: 'Base',
		control: {
			process: { autostart: true, reconnect: false, delay: 1, staleTimeout: 2 },
			source: { source: 'rtmp' },
			limits: { cpu_usage: 1, memory_mbytes: 2, waitfor_seconds: 3 },
		},
		outputs: [{ address: 'rtmp://base', options: ['-f', 'flv'] }],
		settings: { a: 1 },
		profiles: [profile(videoCopy(), audioCopy())],
		streams: [vstream('h264'), astream('aac')],
		fromBase: true,
	});

	add('egress', 'mergeEgressMetadata/with_base_empty', 'mergeEgressMetadata', () => [{}, egressBase()]);
	add('egress', 'mergeEgressMetadata/with_base_null', 'mergeEgressMetadata', () => [null, egressBase()]);
	add('egress', 'mergeEgressMetadata/with_base_partial', 'mergeEgressMetadata', () => [
		{ name: 'New', control: { process: { delay: 9 }, limits: { cpu_usage: 9 } }, settings: { b: 2 } },
		egressBase(),
	]);
	add('egress', 'mergeEgressMetadata/with_base_full', 'mergeEgressMetadata', () => [egressFull('1.0.0'), egressBase()]);

	// --- initSource --------------------------------------------------------
	add('init', 'initSource/no_args', 'initSource', () => []);
	add('init', 'initSource/type_only', 'initSource', () => ['network']);
	add('init', 'initSource/null', 'initSource', () => ['network', null]);
	add('init', 'initSource/empty', 'initSource', () => ['network', {}]);
	add('init', 'initSource/partial', 'initSource', () => ['network', { settings: { mode: 'push' } }]);
	add('init', 'initSource/type_mismatch', 'initSource', () => ['network', { type: 'virtualaudio', extra: 1 }]);
	add('init', 'initSource/full', 'initSource', () => ['network', networkSource(streamLists.h264_aac)]);

	// --- initProfile -------------------------------------------------------
	const profileInputs = {
		undefined: () => undefined,
		null: () => null,
		empty: () => ({}),
		video_only: () => ({ video: { source: 0, stream: 0 } }),
		audio_only: () => ({ audio: { source: 0, stream: 2 } }),
		audio_source_1: () => ({ audio: { source: 1, stream: 0 } }),
		audio_source_1_custom_partial: () => ({ audio: { source: 1, stream: 0 }, custom: { stream: 5 } }),
		custom_full: () => ({ audio: { source: 0, stream: 1 }, custom: { selected: true, stream: -2, extra: 'x' } }),
		mapping_arrays: () => ({
			video: { encoder: { coder: 'libx264', mapping: ['-codec:v', 'libx264'] }, decoder: { coder: 'h264_cuvid', mapping: ['-c:v', 'h264_cuvid'] } },
			audio: { encoder: { coder: 'aac', mapping: ['-codec:a', 'aac'] }, decoder: { coder: 'default', mapping: [] } },
		}),
		mapping_partial_objects: () => ({
			video: { encoder: { coder: 'libx264', mapping: { local: ['-codec:v', 'libx264'] } }, decoder: { mapping: { global: [['-hwaccel', 'cuda']] } } },
			audio: { encoder: { coder: 'aac', mapping: { filter: ['aresample=async=1'], extra: true } }, decoder: { mapping: { local: ['-c:a', 'x'] } } },
		}),
		filters_partial: () => ({
			video: { filter: { graph: 'hflip' } },
			audio: { filter: { settings: { volume: { graph: 'volume=2', settings: { level: '2' } } } } },
		}),
		nulls: () => ({ video: null, audio: null, custom: null }),
		nested_nulls: () => ({ video: { encoder: null, decoder: null, filter: null }, audio: { encoder: null, decoder: null, filter: null } }),
		extra_fields: () => ({ name: 'kept', video: { extra: 1, encoder: { codec: 'h264', extra: 2 } }, audio: { extra: 3 } }),
		full_copy: () => profile(videoCopy(), audioCopy()),
		full_encode: () =>
			profile(videoVAAPI(0, 0, { filter: scaleFilter(), decoder: cuvidDecoder() }), audioMP3(1, 0, { filter: resampleFilter() }), {
				selected: true,
				stream: -2,
			}),
	};

	for (const [name, input] of Object.entries(profileInputs)) {
		add('init', 'initProfile/' + name, 'initProfile', () => [input()]);
	}

	// --- analyzeStreams ----------------------------------------------------
	for (const type of ['video', 'audio', 'other', undefined]) {
		for (const [name, streams] of Object.entries(streamLists)) {
			add('analyzeStreams', type + '/' + name, 'analyzeStreams', () => [type, clone(streams)]);
		}
	}

	// --- preselectProfile --------------------------------------------------
	const preselectProfiles = {
		fresh: () => ({}),
		copy_copy: () => profile(videoCopy(), audioCopy()),
		copy_copy_audio_stream_0: () => profile(videoCopy(), audioCopy(0, 0)),
		x264_aac: () => profile(videoX264(), audioAAC()),
		x264_mp3: () => profile(videoX264(), audioMP3()),
		hevc_opus: () =>
			profile(
				{
					...videoX264(),
					encoder: { coder: 'libx265', codec: 'hevc', settings: {}, mapping: { global: [], local: ['-codec:v', 'libx265'], filter: [] } },
				},
				{
					...audioAAC(),
					encoder: { coder: 'libopus', codec: 'opus', settings: {}, mapping: { global: [], local: ['-codec:a', 'libopus'], filter: [] } },
				},
			),
		unknown_coders: () => scenarios.unknown_coders().profiles[0],
		video_none_audio_none: () =>
			profile(
				{ ...videoCopy(), encoder: { coder: 'none', settings: {}, mapping: { global: [], local: [], filter: [] } } },
				{ ...audioNone(), source: 0, stream: 1 },
			),
		stream_out_of_range: () => profile(videoCopy(0, 5), audioCopy(0, 6)),
		streams_swapped: () => profile(videoCopy(0, 1), audioCopy(0, 0)),
		custom_selected: () => profile(videoCopy(), audioAAC(1, 0), { selected: true, stream: -2 }),
	};

	for (const type of ['video', 'audio']) {
		for (const [sname, streams] of Object.entries(streamLists)) {
			for (const [pname, p] of Object.entries(preselectProfiles)) {
				for (const ename of ['all', 'software']) {
					// The UI always passes an initialized profile.
					add(
						'preselectProfile',
						[type, sname, pname, ename].join('/'),
						['preselectProfile', 'initProfile'],
						() => [type, clone(streams), p(), clone(encoderSets[ename])],
						true,
					);
				}
			}
		}
	}

	// Remaining encoder sets and the preselectAudio flag on a smaller matrix
	for (const type of ['video', 'audio', 'other']) {
		for (const sname of ['h264_aac', 'hevc_aac', 'av1_opus', 'video_only', 'video_only_hevc', 'audio_only', 'audio_only_opus', 'audio_first']) {
			for (const pname of ['fresh', 'copy_copy', 'x264_aac', 'custom_selected']) {
				for (const ename of ['nvenc_mp3', 'no_h264', 'none']) {
					for (const preselectAudio of [true, false]) {
						add(
							'preselectProfile',
							[type, sname, pname, ename, 'preselectAudio=' + preselectAudio].join('/'),
							['preselectProfile', 'initProfile'],
							() => [type, clone(streamLists[sname]), preselectProfiles[pname](), clone(encoderSets[ename]), preselectAudio],
							true,
						);
					}
				}
			}
		}
	}

	// Uninitialized profile (throws in legacy)
	add('preselectProfile', 'video/h264_aac/uninitialized_throws', 'preselectProfile', () => [
		'video',
		clone(streamLists.h264_aac),
		{},
		clone(encoderSets.all),
	]);
	add('preselectProfile', 'audio/h264_aac/uninitialized_throws', 'preselectProfile', () => [
		'audio',
		clone(streamLists.h264_aac),
		{},
		clone(encoderSets.all),
	]);

	// --- validateProfile / createInputsOutputs / createOutputStreams -------
	for (const [name, scenario] of Object.entries(scenarios)) {
		for (const requireVideo of [undefined, true, false]) {
			const suffix = requireVideo === undefined ? '' : '/requireVideo=' + requireVideo;
			const tail = requireVideo === undefined ? [] : [requireVideo];

			scenario().profiles.forEach((_, i) => {
				add('validateProfile', name + '/profile' + i + suffix, 'validateProfile', () => {
					const s = scenario();
					return [s.sources, s.profiles[i], ...tail];
				});
			});

			add('createInputsOutputs', name + suffix, 'createInputsOutputs', () => {
				const s = scenario();
				return [s.sources, s.profiles, ...tail];
			});

			add('createOutputStreams', name + suffix, 'createOutputStreams', () => {
				const s = scenario();
				return [s.sources, s.profiles, ...tail];
			});
		}
	}

	// Same profile listed twice / shared input: input options accumulate across profiles.
	add('createInputsOutputs', 'same_profile_twice_with_decoder', 'createInputsOutputs', () => {
		const s = scenarios.encode_with_decoder();
		return [s.sources, [s.profiles[0], clone(s.profiles[0])]];
	});
	// Calling it twice on the same sources (as the UI does on every change).
	add('createInputsOutputs', 'called_twice_same_sources', ['createInputsOutputs', 'createInputsOutputsTwice'], () => {
		const s = scenarios.separate_audio_source_encode_video();
		return [s.sources, s.profiles];
	});
	// Global options: duplicates and ordering inside a global option tuple.
	add('createInputsOutputs', 'global_options_dedupe_and_sort', 'createInputsOutputs', () => {
		const s = scenarios.encode_with_decoder();
		const p = s.profiles[0];
		p.video.decoder.mapping.global = [
			['-hwaccel', 'cuda'],
			['-z', '-a'],
		];
		p.video.encoder.mapping.global = [
			['cuda', '-hwaccel'],
			['-vsync', 'drop'],
		];
		p.audio.decoder.mapping.global = [['-a', '-z']];
		p.audio.encoder.mapping.global = [['-vsync', 'drop'], ['-single']];
		return [s.sources, s.profiles];
	});

	// --- cleanupSources / cleanupProfile -----------------------------------
	add('cleanup', 'cleanupSources/both', 'cleanupSources', () => [{ video: networkSource(streamLists.h264_aac), audio: virtualAudioSource(), extra: 1 }]);
	add('cleanup', 'cleanupSources/video_only', 'cleanupSources', () => [{ video: networkSource(streamLists.video_only) }]);
	add('cleanup', 'cleanupSources/empty', 'cleanupSources', () => [{}]);
	add('cleanup', 'cleanupSources/null_throws', 'cleanupSources', () => [null]);

	const cleanupProfiles = {
		copy_copy: () => profile(videoCopy(5, 0), audioCopy(7, 1), { selected: false, stream: 1 }),
		custom_selected: () => profile(videoCopy(), audioAAC(0, 0), { selected: true, stream: -2 }),
		custom_selected_truthy: () => profile(videoCopy(), audioAAC(1, 0), { selected: 1, stream: -2 }),
		no_video_stream: () => profile(videoCopy(0, -1), audioCopy(0, 1), { selected: false, stream: 1 }),
		no_audio_stream: () => profile(videoCopy(), audioNone(), { selected: false, stream: -1 }),
		no_audio_stream_custom_selected: () => profile(videoCopy(), { ...audioNone(), source: 1 }, { selected: true, stream: -2 }),
		no_streams: () => profile(videoCopy(2, -1), audioCopy(2, -1), { selected: false, stream: -1 }),
		extra_fields: () => ({ ...profile(videoCopy(), audioCopy(), { selected: false, stream: 1 }), name: 'dropped' }),
		no_custom_throws: () => profile(videoCopy(), audioCopy()),
		empty_throws: () => ({}),
	};

	for (const [name, p] of Object.entries(cleanupProfiles)) {
		add('cleanup', 'cleanupProfile/' + name, 'cleanupProfile', () => [p()]);
	}

	return cases;
};

// How a case's `fn` is executed against a metadata module.
const runners = {
	// preselectProfile on a profile that went through initProfile first
	initProfile: (M, fn, args) => {
		args[2] = M.initProfile(args[2]);
		return M[fn](...args);
	},
	createInputsOutputsTwice: (M, fn, args) => {
		const first = clone(M[fn](...args));
		const second = M[fn](...args);
		return { first: first, second: second };
	},
};

const runCase = (M, c) => {
	const args = c.args();
	const [fn, runner] = Array.isArray(c.fn) ? c.fn : [c.fn, null];

	const record = {};

	try {
		const result = runner ? runners[runner](M, fn, args) : M[fn](...args);
		record.result = result === undefined ? null : result;
	} catch (e) {
		record.throws = e instanceof Error ? e.name : String(e);
	}

	// Arguments after the call, to catch (missing) mutations.
	if (!c.slim) {
		record.args = args.map((a) => (a === undefined ? null : a));
	} else if ('result' in record) {
		// preselectProfile returns the profile it was given
		record.sameProfile = record.result === args[2];
	}

	// Normalize to what ends up in the JSON fixture.
	return clone(record);
};

/**
 * Run all cases against a metadata module.
 * @returns {Record<string, Record<string, {result?: any, throws?: string, args: any[]}>>} group -> case name -> record
 */
const runCases = (M) => {
	const groups = {};

	for (const c of buildCases()) {
		if (!(c.group in groups)) {
			groups[c.group] = {};
		}

		if (c.name in groups[c.group]) {
			throw new Error('duplicate case name: ' + c.group + ' ' + c.name);
		}

		groups[c.group][c.name] = runCase(M, c);
	}

	return groups;
};

const exportNames = [
	'getDefaultMetadata',
	'getDefaultIngestMetadata',
	'getDefaultEgressMetadata',
	'initMetadata',
	'initIngestMetadata',
	'initEgressMetadata',
	'mergeMetadata',
	'mergeIngestMetadata',
	'mergeEgressMetadata',
	'validateProfile',
	'createInputsOutputs',
	'createOutputStreams',
	'initSource',
	'initProfile',
	'analyzeStreams',
	'preselectProfile',
	'cleanupProfile',
	'cleanupSources',
];

export { buildCases, runCases, exportNames };
