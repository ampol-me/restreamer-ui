import { describe, expect, test } from 'bun:test';

import Sources, { availableSources } from './index';
import * as P from './playlist';

const item = (id: string, over: Partial<P.PlaylistItem> = {}): P.PlaylistItem => ({
	id,
	title: `${id}.mp4`,
	file: `playlist${id}.mp4`,
	size: 1,
	video: 'h264 1920x1080 25 fps',
	audio: 'aac 48000 Hz 2 ch',
	...over,
});

describe('playlist source', () => {
	test('is registered and offered where the core lists it', () => {
		expect(Sources.Get('playlist')?.name).toBe('Playlist');
		expect(availableSources('video', ['network', 'playlist'], '6.1.1').map((s) => s.id)).toContain('playlist');
		expect(availableSources('audio', ['network', 'playlist'], '6.1.1').map((s) => s.id)).not.toContain('playlist');
	});

	test('input: the playlist file through the concat demuxer, at playback speed, looped unless switched off', () => {
		const settings = { items: [item('a')], address: '/channels/c1/playlistlist3.ffconcat', revision: 3 };
		expect(P.createInputs({ ...settings, loop: true })).toEqual([
			{ address: '{diskfs}/channels/c1/playlistlist3.ffconcat', options: ['-stream_loop', '-1', '-re', '-f', 'concat'] },
		]);
		expect(P.createInputs({ ...settings, loop: false })[0]!.options).toEqual(['-re', '-f', 'concat']);
		expect(P.initSettings(null)).toEqual({ items: [], loop: true, address: '', revision: 0 });
	});

	test('stored names survive the sanitising of UploadData and need no quoting in the playlist file', () => {
		const stored = P.storeName('My Holiday (final) v2.MP4', 'abc123xy')!;
		expect(stored).toEqual({ id: 'abc123xy', file: 'playlistabc123xy.mp4' });
		expect(stored.file.replace(/[^0-9a-z.]/gi, '')).toBe(stored.file);
		expect(P.listName(4).replace(/[^0-9a-z.]/gi, '')).toBe(P.listName(4));
		for (let i = 0; i < 50; i++) expect(P.storeName('a.mov')!.file).toMatch(/^playlist[a-z0-9]{8}\.mov$/);

		expect(P.storeName('notes.txt')).toBeNull();
		expect(P.storeName('noextension')).toBeNull();
		expect(P.storeName('evil.mp4.exe')).toBeNull();
	});

	test('playlist file lists the files in order', () => {
		expect(P.listFile([item('b'), item('a')])).toBe('ffconcat version 1.0\nfile playlistb.mp4\nfile playlista.mp4\n');
	});

	test('files that differ from the first one are flagged', () => {
		const items = [
			item('a'),
			item('b'),
			item('c', { video: 'h264 1280x720 25 fps' }),
			item('d', { audio: 'aac 44100 Hz 2 ch' }),
			item('e', { video: '', audio: '' }),
		];
		expect([...P.mismatches(items)]).toEqual(['c', 'd', 'e']);
		expect(P.mismatches([]).size).toBe(0);
	});

	test('describes probed streams by what has to match', () => {
		expect(
			P.describeStreams([
				{ type: 'video', codec: 'hevc', width: 3840, height: 2160, fps: 29.97003 },
				{ type: 'audio', codec: 'aac', sampling_hz: 48000, channels: 2 },
			]),
		).toEqual({ video: 'hevc 3840x2160 29.97 fps', audio: 'aac 48000 Hz 2 ch' });
		expect(P.describeStreams([{ type: 'video', codec: 'h264', width: 640, height: 360 }])).toEqual({ video: 'h264 640x360', audio: '' });
	});

	test('orphans: playlist files of the channel that the settings no longer use; other channel files are left alone', () => {
		const settings = { items: [item('a')], address: '/channels/c1/playlistlist2.ffconcat' };
		const stored = ['playlista.mp4', 'playlistb.mp4', 'playlistlist1.ffconcat', 'playlistlist2.ffconcat', 'logo.png', 'videoloop.source', 'config.js'];
		expect(P.orphans(stored, settings)).toEqual(['playlistb.mp4', 'playlistlist1.ffconcat']);
	});

	test('reordering', () => {
		const items = [item('a'), item('b'), item('c')];
		expect(P.moveItem(items, 0, 2).map((i) => i.id)).toEqual(['b', 'c', 'a']);
		expect(P.moveItem(items, 2, 0).map((i) => i.id)).toEqual(['c', 'a', 'b']);
		expect(P.moveItem(items, 1, 1)).toBe(items);
		expect(P.moveItem(items, 0, 3)).toBe(items);
	});
});
