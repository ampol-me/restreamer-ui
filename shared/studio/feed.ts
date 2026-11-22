// The Studio's programme on its way to the core. The browser records the mixed picture and
// sends it in pieces to this UI's server; there ffmpeg turns it into the H.264/AAC stream with
// regular keyframes that the channel expects and publishes it on the core's RTMP server, like
// an encoder would.
import type { Quality } from './setup';

interface CoreRtmpConfig {
	enable?: unknown;
	address?: unknown;
	app?: unknown;
	token?: unknown;
}

/**
 * Where the server publishes a channel's feed: the core's RTMP server as seen from this server
 * (`coreAddress`, e.g. http://core:8080). `config` is the core's stored config. Null if the
 * RTMP server is switched off or the address cannot be made out.
 */
export function feedTarget(coreAddress: string, config: unknown, channelid: string): string | null {
	const rtmp = ((config as { rtmp?: CoreRtmpConfig } | null)?.rtmp ?? {}) as CoreRtmpConfig;
	if (rtmp.enable !== true) return null;

	let host: string;
	try {
		host = new URL(coreAddress).hostname;
	} catch {
		return null;
	}
	if (!host) return null;

	// ":1935" or "0.0.0.0:1935": only the port matters, the host is the core's.
	const port = /:(\d+)$/.exec(typeof rtmp.address === 'string' ? rtmp.address : '')?.[1] ?? '1935';

	// The same clean-up the client applies to the app (shared/core/restreamer.ts, _initConfig).
	let app = (typeof rtmp.app === 'string' ? rtmp.app : '').replace(/\/+/g, '/');
	if (app === '/' || app === '') {
		app = '';
	} else {
		if (app.endsWith('/')) app = app.slice(0, -1);
		if (!app.startsWith('/')) app = '/' + app;
	}

	const token = typeof rtmp.token === 'string' ? rtmp.token : '';

	return `rtmp://${host}:${port}${app}/${channelid}.stream${token ? '?token=' + encodeURIComponent(token) : ''}`;
}

/** The target as it may appear in a log or an error message. */
export const maskTarget = (target: string) => target.replace(/([?&]token=)[^&]*/, '$1***');

/** ffmpeg's arguments: the recording comes in on stdin, progress goes out on stdout. */
export function feedArgs(quality: Quality, target: string): string[] {
	const { width, height, fps, videoKbit, audioKbit } = quality;
	// A keyframe every two seconds, exactly: the core cuts HLS segments at keyframes.
	const gop = String(fps * 2);

	return [
		'-hide_banner',
		'-loglevel',
		'warning',
		'-nostats',
		'-progress',
		'pipe:1',
		'-stats_period',
		'1',
		'-fflags',
		'+genpts+discardcorrupt',
		'-analyzeduration',
		'2000000',
		'-thread_queue_size',
		'512',
		'-i',
		'pipe:0',
		'-map',
		'0:v:0',
		'-map',
		'0:a:0',
		// A browser recording has no steady frame rate and may change size: both are fixed here.
		'-vf',
		`scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,fps=${fps}`,
		'-c:v',
		'libx264',
		'-preset',
		'veryfast',
		'-tune',
		'zerolatency',
		'-profile:v',
		'high',
		'-pix_fmt',
		'yuv420p',
		'-g',
		gop,
		'-keyint_min',
		gop,
		'-sc_threshold',
		'0',
		'-b:v',
		`${videoKbit}k`,
		'-maxrate',
		`${videoKbit}k`,
		'-bufsize',
		`${videoKbit * 2}k`,
		'-af',
		'aresample=async=1:first_pts=0',
		'-c:a',
		'aac',
		'-b:a',
		`${audioKbit}k`,
		'-ar',
		'48000',
		'-ac',
		'2',
		'-f',
		'flv',
		target,
	];
}

export interface FeedProgress {
	frames: number;
	fps: number;
	bitrateKbit: number;
	/** 1 = encoding keeps up with the recording. */
	speed: number;
	dropped: number;
	duplicated: number;
	seconds: number;
}

export const emptyFeedProgress = (): FeedProgress => ({ frames: 0, fps: 0, bitrateKbit: 0, speed: 0, dropped: 0, duplicated: 0, seconds: 0 });

const number = (value: string | undefined) => {
	const n = parseFloat(value ?? '');
	return Number.isFinite(n) ? n : 0;
};

/**
 * Reads ffmpeg's `-progress` output (key=value lines, a block ends with "progress=…").
 * Returns the last complete block of `text`, or null if it holds none.
 */
export function parseFeedProgress(text: string): FeedProgress | null {
	const end = text.lastIndexOf('progress=');
	if (end === -1) return null;

	const before = text.lastIndexOf('progress=', end - 1);
	const block = text.slice(before === -1 ? 0 : before, end);

	const values = new Map<string, string>();
	for (const line of block.split('\n')) {
		const at = line.indexOf('=');
		if (at > 0) values.set(line.slice(0, at).trim(), line.slice(at + 1).trim());
	}

	return {
		frames: number(values.get('frame')),
		fps: number(values.get('fps')),
		bitrateKbit: number(values.get('bitrate')),
		speed: number(values.get('speed')),
		dropped: number(values.get('drop_frames')),
		duplicated: number(values.get('dup_frames')),
		seconds: number(values.get('out_time_us')) / 1_000_000,
	};
}

/** What the server answers for every piece it took. */
export interface FeedStatus {
	progress: FeedProgress;
}
