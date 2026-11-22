// The Studio feeds that are on their way to the core: one ffmpeg per channel that is live from
// a browser. The browser posts its recording piece by piece; the pieces go into ffmpeg's stdin
// in the order they were recorded.
import { spawn, type ChildProcess } from 'node:child_process';
import { randomBytes } from 'node:crypto';

import { emptyFeedProgress, feedArgs, maskTarget, parseFeedProgress, type FeedProgress } from '../../../shared/studio/feed';
import type { Quality } from '../../../shared/studio/setup';

export type FeedFailure = 'busy' | 'no-ffmpeg' | 'unknown' | 'ended' | 'gap' | 'overrun';

export class FeedError extends Error {
	constructor(
		public reason: FeedFailure,
		message: string,
	) {
		super(message);
	}
}

interface Feed {
	id: string;
	channelid: string;
	child: ChildProcess;
	// The piece expected next. A piece that was already taken is acknowledged again: the
	// browser repeats one whose answer got lost.
	next: number;
	lastData: number;
	progress: FeedProgress;
	stdout: string;
	// Last lines ffmpeg wrote, for the message when it gives up.
	log: string[];
	ended: string | null;
}

export interface FeedOptions {
	ffmpegPath?: string;
	/** A feed that got nothing for this long is taken off air: its browser is gone. */
	idleMs?: number;
	/** ffmpeg not taking its input: more than this many bytes waiting ends the feed. */
	maxBufferedBytes?: number;
	now?: () => number;
}

export class FeedSessions {
	private feeds = new Map<string, Feed>();
	private timer: ReturnType<typeof setInterval> | null = null;
	private readonly ffmpegPath: string;
	private readonly idleMs: number;
	private readonly maxBufferedBytes: number;
	private readonly now: () => number;

	constructor(options: FeedOptions = {}) {
		this.ffmpegPath = options.ffmpegPath || 'ffmpeg';
		this.idleMs = options.idleMs ?? 20_000;
		this.maxBufferedBytes = options.maxBufferedBytes ?? 64 * 1024 * 1024;
		this.now = options.now ?? Date.now;
	}

	/** Channels that are live from a Studio right now. */
	live(): string[] {
		return [...this.feeds.values()].filter((f) => f.ended === null).map((f) => f.channelid);
	}

	async start(channelid: string, target: string, quality: Quality): Promise<string> {
		if (this.live().includes(channelid)) {
			throw new FeedError('busy', 'This channel is already live from another Studio.');
		}

		const child = spawn(this.ffmpegPath, feedArgs(quality, target), { stdio: ['pipe', 'pipe', 'pipe'] });

		try {
			await new Promise<void>((resolve, reject) => {
				child.once('spawn', resolve);
				child.once('error', reject);
			});
		} catch (e: unknown) {
			if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
				throw new FeedError('no-ffmpeg', 'FFmpeg is not installed on the server of this UI.');
			}
			throw new FeedError('unknown', `FFmpeg could not be started: ${(e as Error).message}`);
		}

		const feed: Feed = {
			id: randomBytes(32).toString('hex'),
			channelid,
			child,
			next: 0,
			lastData: this.now(),
			progress: emptyFeedProgress(),
			stdout: '',
			log: [],
			ended: null,
		};

		child.stdout?.setEncoding('utf8').on('data', (text: string) => {
			feed.stdout = (feed.stdout + text).slice(-4000);
			feed.progress = parseFeedProgress(feed.stdout) ?? feed.progress;
		});
		child.stderr?.setEncoding('utf8').on('data', (text: string) => {
			feed.log = [...feed.log, ...text.split('\n').filter((line) => line.trim() !== '')].slice(-12);
		});
		// A closed stdin surfaces as an error on the next write; the exit below says why.
		child.stdin?.on('error', () => {});
		child.on('error', () => {});
		child.once('exit', (code) => {
			feed.ended ??= code === 0 ? 'The feed has ended.' : `FFmpeg stopped: ${maskTarget(feed.log.at(-1) ?? `exit code ${code}`)}`;
		});

		this.feeds.set(feed.id, feed);
		this.timer ??= setInterval(() => this.reap(), 5000);

		return feed.id;
	}

	/** Takes piece number `seq` of a feed's recording. */
	push(id: string, seq: number, data: Uint8Array): FeedProgress {
		const feed = this.feeds.get(id);
		if (!feed) {
			throw new FeedError('unknown', 'This feed does not exist (any more).');
		}
		if (feed.ended !== null) {
			throw new FeedError('ended', feed.ended);
		}

		feed.lastData = this.now();

		if (seq < feed.next) return feed.progress;
		if (seq > feed.next) {
			throw new FeedError('gap', 'A piece of the recording is missing.');
		}

		const stdin = feed.child.stdin;
		if (!stdin || stdin.destroyed) {
			throw new FeedError('ended', feed.ended ?? 'FFmpeg stopped.');
		}
		if (stdin.writableLength > this.maxBufferedBytes) {
			this.end(id, 'The server cannot keep up with encoding the picture.');
			throw new FeedError('overrun', 'The server cannot keep up with encoding the picture.');
		}

		stdin.write(data);
		feed.next = seq + 1;

		return feed.progress;
	}

	/** Takes a feed off air. Its id answers with `why` for a while, then is forgotten. */
	end(id: string, why = 'The feed has ended.'): boolean {
		const feed = this.feeds.get(id);
		if (!feed) return false;

		if (feed.ended === null) {
			feed.ended = why;
			const child = feed.child;
			child.stdin?.end();
			// With its input closed ffmpeg finishes the stream by itself; this is for one that hangs.
			const kill = setTimeout(() => child.kill('SIGKILL'), 5000);
			child.once('exit', () => clearTimeout(kill));
		}

		return true;
	}

	private reap() {
		const now = this.now();
		for (const feed of this.feeds.values()) {
			if (feed.ended === null && now - feed.lastData > this.idleMs) {
				this.end(feed.id, 'The Studio stopped sending.');
			} else if (feed.ended !== null && now - feed.lastData > 10 * this.idleMs) {
				this.feeds.delete(feed.id);
			}
		}
		if (this.feeds.size === 0 && this.timer) {
			clearInterval(this.timer);
			this.timer = null;
		}
	}

	/** Ends everything (tests, shutdown). */
	close() {
		for (const feed of this.feeds.values()) {
			feed.child.kill('SIGKILL');
		}
		this.feeds.clear();
		if (this.timer) clearInterval(this.timer);
		this.timer = null;
	}
}
