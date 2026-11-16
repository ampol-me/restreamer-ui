// Generated from legacy/src/misc/filters/video/Framerate.js by scripts/legacy-extract.mjs, then maintained by hand.
// @ts-nocheck -- 1:1 port of untyped legacy logic; typed incrementally.
// Framerate Filter
// http://ffmpeg.org/ffmpeg-all.html#framerate

function init(initialState) {
	const state = {
		enabled: false,
		fps: '30',
		...initialState,
	};
	return state;
}
function createGraph(settings) {
	settings = init(settings);
	const mapping = [];
	if (settings.enabled) {
		mapping.push(`framerate=fps=${settings.fps}`);
	}
	return mapping.join(',');
}
const filter = 'fps';
const name = 'Frame Interpolation';
const type = 'video';
const hwaccel = false;
function summarize(settings) {
	return `${name} (${settings.fps}fps)`;
}
function defaults() {
	const settings = init({});
	return {
		settings: settings,
		graph: createGraph(settings),
	};
}
export { name, filter, type, hwaccel, summarize, defaults, createGraph };
