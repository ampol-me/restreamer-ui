// Generated from legacy/src/misc/filters/video/HFlip.js by scripts/legacy-extract.mjs, then maintained by hand.
// @ts-nocheck -- 1:1 port of untyped legacy logic; typed incrementally.
// HFlip Filter
// http://ffmpeg.org/ffmpeg-all.html#hflip

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
		mapping.push('hflip');
	}
	return mapping.join(',');
}
const filter = 'hflip';
const name = 'Horizonal Flip';
const type = 'video';
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
