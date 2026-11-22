// Generated from legacy/src/misc/filters/audio/Loudnorm.js by scripts/legacy-extract.mjs, then maintained by hand.
// @ts-nocheck -- 1:1 port of untyped legacy logic; typed incrementally.
// Loudnorm Filter
// http://ffmpeg.org/ffmpeg-all.html#loudnorm

function init(initialState) {
	const state = {
		enabled: false,
		...initialState,
	};
	return state;
}
function createGraph(settings) {
	settings = init(settings);
	const mapping = [];
	if (settings.enabled) {
		mapping.push('loudnorm');
	}
	return mapping.join(',');
}
const filter = 'loudnorm';
const name = 'Loudness Normalization';
const type = 'audio';
const hwaccel = false;
function summarize(settings) {
	return `${name}`;
}
function defaults() {
	const settings = init({});
	return {
		settings: settings,
		graph: createGraph(settings),
	};
}
export { name, filter, type, hwaccel, summarize, defaults, createGraph, init };
