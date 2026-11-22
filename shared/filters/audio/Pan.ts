// Generated from legacy/src/misc/filters/audio/Pan.js by scripts/legacy-extract.mjs, then maintained by hand.
// @ts-nocheck -- 1:1 port of untyped legacy logic; typed incrementally.
// Pan Filter
// https://ffmpeg.org/ffmpeg-filters.html#pan-1

function init(initialState) {
	const state = {
		value: 'inherit',
		...initialState,
	};
	return state;
}
function createGraph(settings) {
	settings = init(settings);
	const mapping = [];
	switch (settings.value) {
		case 'mute_left':
			mapping.push('pan=stereo|c1=c1');
			break;
		case 'mute_right':
			mapping.push('pan=stereo|c0=c0');
			break;
		default:
			break;
	}
	return mapping;
}

// filter

const filter = 'pan';
const name = 'Pan';
const type = 'audio';
const hwaccel = false;
function summarize(settings) {
	return `${name} (${settings.value.replace(/_/i, ' ')})`;
}
function defaults() {
	const settings = init({});
	return {
		settings: settings,
		graph: createGraph(settings),
	};
}
export { name, filter, type, hwaccel, summarize, defaults, createGraph, init };
