// Which files of the core's storage a portal viewer may fetch for a channel.
// The ingest writes (see shared/core/restreamer.ts, UpsertIngest):
//   memfs:  <id>.m3u8  <id>_<output>.m3u8  <id>_<output>_0001.ts|.mp4  <id>.mp4  <id>.jpg
//   diskfs: the same playlists, segments under <id>/<output>/<date>/<n>.ts
// LL-HLS additionally writes init-<id>.<ext> and chunk-<id>-00001.<ext>.

const CHANNEL_ID = /^[A-Za-z0-9][A-Za-z0-9-]{0,63}$/;
const SEGMENT = /^[A-Za-z0-9._-]+$/;
const EXTENSIONS = new Set(['m3u8', 'ts', 'mp4', 'm4s', 'm4v', 'm4a', 'mpd', 'jpg']);

export function isChannelId(value: unknown): value is string {
	return typeof value === 'string' && CHANNEL_ID.test(value);
}

export function isAllowedStreamPath(channelid: string, path: string): boolean {
	if (!isChannelId(channelid) || typeof path !== 'string' || path.length === 0 || path.length > 512) {
		return false;
	}

	const segments = path.split('/');
	if (segments.some((s) => !SEGMENT.test(s) || s === '.' || s === '..' || s.startsWith('.'))) {
		return false;
	}

	const file = segments[segments.length - 1]!;
	const extension = file.includes('.') ? file.slice(file.lastIndexOf('.') + 1).toLowerCase() : '';
	if (!EXTENSIONS.has(extension)) {
		return false;
	}

	const first = segments[0]!;

	// <id>/… (diskfs segments)
	if (segments.length > 1) {
		return first === channelid;
	}

	// <id>.ext, <id>_… ; the separator keeps one id from matching another id it is a prefix of
	if (first.startsWith(channelid)) {
		const next = first[channelid.length];
		return next === '.' || next === '_';
	}

	// init-<id>.ext, chunk-<id>-00001.ext (LL-HLS)
	for (const prefix of ['init-', 'chunk-']) {
		if (first.startsWith(prefix + channelid)) {
			const next = first[prefix.length + channelid.length];
			return next === '.' || next === '-';
		}
	}

	return false;
}

export type StreamStorage = 'memfs' | 'diskfs';

/** Path below the core's HTTP root for a stream file. */
export function upstreamStreamPath(storage: StreamStorage, path: string): string {
	return (storage === 'diskfs' ? '/' : '/memfs/') + path;
}
