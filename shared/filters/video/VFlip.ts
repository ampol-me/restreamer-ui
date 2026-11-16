// Generated from legacy/src/misc/filters/video/VFlip.js by scripts/legacy-extract.mjs, then maintained by hand.
// @ts-nocheck -- 1:1 port of untyped legacy logic; typed incrementally.
// VFlip Filter
// http://ffmpeg.org/ffmpeg-all.html#vflip

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
		mapping.push('vflip');
	}
	return mapping.join(',');
}
const filter = 'vflip';
const name = 'Vertical Flip';
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
export { name, filter, type, hwaccel, summarize, defaults, createGraph };
