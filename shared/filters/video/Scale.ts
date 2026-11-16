// Generated from legacy/src/misc/filters/video/Scale.js by scripts/legacy-extract.mjs, then maintained by hand.
// @ts-nocheck -- 1:1 port of untyped legacy logic; typed incrementally.
// Scale Filter
// https://ffmpeg.org/ffmpeg-all.html#scale-1

function init(initialState) {
	const state = {
		mode: 'none',
		fix: '1280x720',
		width: '1280',
		height: '720',
		...initialState,
	};
	return state;
}
function createGraph(settings) {
	settings = init(settings);
	const mapping = [];
	if (settings.mode === 'height') {
		mapping.push(`scale=-1:${settings.height}`);
	} else if (settings.mode === 'width') {
		mapping.push(`scale=${settings.width}:-1`);
	} else if (settings.mode === 'fix') {
		mapping.push(`scale=${settings.fix}`);
	}
	return mapping.join(',');
}
const filter = 'scale';
const name = 'Scale';
const type = 'video';
const hwaccel = false;
function summarize(settings) {
	if (settings.mode === 'height') {
		return `${name} (-1:${settings.height})`;
	} else if (settings.mode === 'width') {
		return `${name} (${settings.width}:-1)`;
	} else if (settings.mode === 'fix') {
		return `${name} (${settings.fix})`;
	}
}
function defaults() {
	const settings = init({});
	return {
		settings: settings,
		graph: createGraph(settings),
	};
}
export { name, filter, type, hwaccel, summarize, defaults, createGraph };
