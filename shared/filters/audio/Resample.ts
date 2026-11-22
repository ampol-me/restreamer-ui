// Generated from legacy/src/misc/filters/audio/Resample.js by scripts/legacy-extract.mjs, then maintained by hand.
// @ts-nocheck -- 1:1 port of untyped legacy logic; typed incrementally.
// Resample Filter
// https://ffmpeg.org/ffmpeg-filters.html#toc-aresample-1

function init(initialState) {
	const state = {
		channels: '2',
		layout: 'stereo',
		sampling: '44100',
		...initialState,
	};
	return state;
}
function createGraph(settings) {
	settings = init(settings);
	const mapping = [];
	const sampling = settings.sampling;
	const layout = settings.layout;
	if (sampling !== 'inherit') {
		mapping.push(`osr=${sampling}`);
	}
	if (layout !== 'inherit') {
		mapping.push(`ochl=${layout}`);
	}
	if (mapping.length === 0) {
		return '';
	}
	return 'aresample=' + mapping.join(':');
}
const filter = 'aresample';
const name = 'Resample';
const type = 'audio';
const hwaccel = false;
function summarize(settings) {
	return `${name} (${settings.layout}, ${settings.sampling}Hz)`;
}
function defaults() {
	const settings = init({});
	return {
		settings: settings,
		graph: createGraph(settings),
	};
}
export { name, filter, type, hwaccel, summarize, defaults, createGraph, init };
