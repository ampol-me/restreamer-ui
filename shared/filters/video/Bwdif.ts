// Generated from legacy/src/misc/filters/video/Bwdif.js by scripts/legacy-extract.mjs, then maintained by hand.
// @ts-nocheck -- 1:1 port of untyped legacy logic; typed incrementally.
// Deinterlace the input video ("bwdif" stands for "Bob Weaver Deinterlacing Filter").
// http://ffmpeg.org/ffmpeg-all.html#bwdif

function init(initialState) {
	const state = {
		enabled: false,
		mode: '1',
		parity: '-1',
		deint: '0',
		...initialState,
	};
	return state;
}
function createGraph(settings) {
	settings = init(settings);
	const mapping = [];
	if (settings.enabled) {
		mapping.push(`bwdif=mode=${settings.mode}:parity=${settings.parity}:deint=${settings.deint}`);
	}
	return mapping.join(',');
}
const filter = 'bwdif';
const name = 'Deinterlacing Filter';
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
