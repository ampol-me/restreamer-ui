// A channel that plays uploaded video files one after the other, as if it were live ("VOD channel").
// Not part of the legacy UI. The files are stored with the channel on the core's disk and read by
// ffmpeg's concat demuxer; they are played as uploaded, so they have to share codec, size and rate.
import type { SourceCapability, SourceInput } from './types';

export interface PlaylistItem {
	/** Random id; the stored file is named after it. */
	id: string;
	/** The name of the uploaded file, shown in the list. */
	title: string;
	/** Name of the stored file below /channels/<channelid>/. */
	file: string;
	size: number;
	/** What the core's probe found, e.g. "h264 1920x1080 25 fps"; '' if the probe failed. */
	video: string;
	audio: string;
}

export interface Settings {
	items: PlaylistItem[];
	loop: boolean;
	/** Path of the playlist file on the core's disk; '' until there is one. */
	address: string;
	/** Counts the playlist files written, so that every change gets a new address (and restarts the channel when saved). */
	revision: number;
}

export const extensions = ['mp4', 'mov', 'm4v', 'mkv', 'ts', 'flv', 'webm'];
export const accept = extensions.map((e) => `.${e}`).join(',');

/** All stored files of a playlist start with this (UploadData keeps only [0-9a-z.] of a name). */
export const filePrefix = 'playlist';

const initSettings = (initialSettings?: Partial<Settings> | null): Settings => {
	const given = initialSettings ?? {};
	return {
		items: Array.isArray(given.items) ? given.items : [],
		loop: given.loop !== false,
		address: typeof given.address === 'string' ? given.address : '',
		revision: Number.isFinite(given.revision) ? Number(given.revision) : 0,
	};
};

const createInputs = (settings: Partial<Settings>): SourceInput[] => {
	const s = initSettings(settings);
	const options: (string | number)[] = [];
	if (s.loop) options.push('-stream_loop', '-1');
	// -re: read at the speed of the video, as a live source would deliver it.
	options.push('-re', '-f', 'concat');

	return [{ address: '{diskfs}' + s.address, options }];
};

/** The extension a file is stored with, or null if it is not a video this source takes. */
export function extensionOf(filename: string): string | null {
	const extension = filename.includes('.') ? filename.slice(filename.lastIndexOf('.') + 1).toLowerCase() : '';
	return extensions.includes(extension) ? extension : null;
}

const newId = () => Math.random().toString(36).slice(2, 10).padEnd(8, '0');

/** Name under which an uploaded file is stored. */
export function storeName(filename: string, id = newId()): { id: string; file: string } | null {
	const extension = extensionOf(filename);
	return extension ? { id, file: `${filePrefix}${id}.${extension}` } : null;
}

export const listName = (revision: number) => `${filePrefix}list${revision}.ffconcat`;

/** The playlist file for ffmpeg. File names are relative to it and need no quoting (see storeName). */
export function listFile(items: PlaylistItem[]): string {
	return ['ffconcat version 1.0', ...items.map((item) => `file ${item.file}`), ''].join('\n');
}

/** What a probed stream is compared by. */
export function describeStreams(
	streams: { type: string; codec: string; width?: number; height?: number; fps?: number; sampling_hz?: number; channels?: number }[],
): {
	video: string;
	audio: string;
} {
	const v = streams.find((s) => s.type === 'video');
	const a = streams.find((s) => s.type === 'audio');
	const fps = v?.fps ? ` ${Math.round(v.fps * 100) / 100} fps` : '';
	return {
		video: v ? `${v.codec} ${v.width}x${v.height}${fps}` : '',
		audio: a ? `${a.codec} ${a.sampling_hz} Hz ${a.channels} ch` : '',
	};
}

/**
 * The items that do not match the first one. Files are played as uploaded: a different codec,
 * picture size, frame rate or audio format breaks the stream where that file starts.
 */
export function mismatches(items: PlaylistItem[]): Set<string> {
	const first = items[0];
	return new Set(first ? items.filter((item) => item.video !== first.video || item.audio !== first.audio).map((item) => item.id) : []);
}

/** The stored files that nothing refers to any more (`stored`: file names of the channel). */
export function orphans(stored: string[], settings: Partial<Settings>): string[] {
	const s = initSettings(settings);
	const used = new Set([...s.items.map((item) => item.file), s.address.slice(s.address.lastIndexOf('/') + 1)]);
	return stored.filter((name) => name.startsWith(filePrefix) && !used.has(name));
}

export function moveItem(items: PlaylistItem[], from: number, to: number): PlaylistItem[] {
	if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return items;
	const next = [...items];
	next.splice(to, 0, next.splice(from, 1)[0]!);
	return next;
}

const id = 'playlist';
const name = 'Playlist';
const capabilities: SourceCapability[] = ['video'];
const ffversion = '^4.1.0 || ^5.0.0 || ^6.1.0';
const icon = 'i-lucide-list-video';

const func = { initSettings, createInputs };

export { id, name, capabilities, ffversion, icon, func, initSettings, createInputs };
