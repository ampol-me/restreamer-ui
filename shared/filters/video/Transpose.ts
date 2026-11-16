// Generated from legacy/src/misc/filters/video/Transpose.js by scripts/legacy-extract.mjs, then maintained by hand.
// @ts-nocheck -- 1:1 port of untyped legacy logic; typed incrementally.
// Transpose Filter
// http://ffmpeg.org/ffmpeg-all.html#transpose-1

function init(initialState) {
	const state = {
		value: 'none',
		...initialState,
	};
	return state;
}
function createGraph(settings) {
	settings = init(settings);
	const mapping = [];
	switch (settings.value) {
		case '90':
			mapping.push('transpose=dir=clock:passthrough=none');
			break;
		case '180':
			mapping.push('transpose=dir=clock:passthrough=none', 'transpose=dir=clock:passthrough=none');
			break;
		case '270':
			mapping.push('transpose=dir=cclock:passthrough=none');
			break;
		default:
			break;
	}
	return mapping.join(',');
}

// filter

const filter = 'transpose';
const name = 'Transpose';
const type = 'video';
const hwaccel = false;
function summarize(settings) {
	return `${name} (${settings.value}° clockwise)`;
}
function defaults() {
	const settings = init({});
	return {
		settings: settings,
		graph: createGraph(settings),
	};
}
export { name, filter, type, hwaccel, summarize, defaults, createGraph };
