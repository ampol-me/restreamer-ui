// Generated from legacy/src/misc/filters/audio/Volume.js by scripts/legacy-extract.mjs, then maintained by hand.
// @ts-nocheck -- 1:1 port of untyped legacy logic; typed incrementally.
// Volume Filter
// http://ffmpeg.org/ffmpeg-all.html#volume

function init(initialState) {
	const state = {
		level: 'inherit',
		db: 0,
		...initialState,
	};
	return state;
}
function createGraph(settings) {
	settings = init(settings);
	const mapping = [];
	switch (settings.level) {
		case 'inherit':
			break;
		case 'custom':
			mapping.push(`volume=volume=${settings.db}dB`);
			break;
		default:
			mapping.push(`volume=volume=${parseInt(settings.level) / 100}`);
			break;
	}
	return mapping.join(',');
}
const filter = 'volume';
const name = 'Volume';
const type = 'audio';
const hwaccel = false;
function summarize(settings) {
	let summary = `${name} (`;
	if (settings.level === 'custom') {
		summary += `${settings.db}dB`;
	} else {
		summary += `${settings.level}%`;
	}
	summary += ')';
	return summary;
}
function defaults() {
	const settings = init({});
	return {
		settings: settings,
		graph: createGraph(settings),
	};
}
export { name, filter, type, hwaccel, summarize, defaults, createGraph, init };
