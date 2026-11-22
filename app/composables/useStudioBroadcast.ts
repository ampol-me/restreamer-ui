import { emptyFeedProgress, type FeedProgress, type FeedStatus } from '#shared/studio/feed';
import { QUALITIES, type QualityId } from '#shared/studio/setup';

export type BroadcastState = 'idle' | 'starting' | 'sending' | 'stopping';

// One piece of the recording per request.
const PIECE_MS = 500;
// This much recording waiting to be sent means the upload cannot carry the programme.
const MAX_WAITING = 30;
const RETRIES = 4;

// Chrome and Firefox record WebM, Safari MP4. The server re-encodes either.
const MIME_TYPES = ['video/webm;codecs=vp8,opus', 'video/webm;codecs=h264,opus', 'video/webm', 'video/mp4'];

interface FetchFailure {
	statusCode?: number;
	statusMessage?: string;
	data?: { reason?: string };
}

/**
 * Sends the Studio's programme to this UI's server, which publishes it on the core
 * (server/utils/studio/sessions.ts): the stream is recorded in short pieces that are posted
 * one after the other.
 */
export function useStudioBroadcast() {
	const { t } = useI18n();
	const { accessToken } = useRestreamer();

	const state = ref<BroadcastState>('idle');
	/** Why the last broadcast ended by itself, in the user's terms. */
	const error = ref('');
	const progress = ref<FeedProgress>(emptyFeedProgress());
	/** Pieces recorded but not yet taken by the server. */
	const waiting = ref(0);
	const uploadKbit = ref(0);

	let recorder: MediaRecorder | null = null;
	let feed = '';
	let queue: Blob[] = [];
	let seq = 0;
	let pumping = false;
	let sentBytes = 0;
	let rateTimer: ReturnType<typeof setInterval> | null = null;

	async function authorization(): Promise<Record<string, string>> {
		const token = await accessToken();
		return token ? { Authorization: `Bearer ${token}` } : {};
	}

	const message = (e: unknown, fallback: string) => (e as FetchFailure)?.statusMessage || fallback;

	/** What the server can do: its ffmpeg ('' = none) and the channels that are live from a Studio. */
	async function status(): Promise<{ ffmpeg: string; live: string[] } | null> {
		try {
			return await $fetch<{ ffmpeg: string; live: string[] }>('/api/studio/status', { headers: await authorization() });
		} catch {
			return null;
		}
	}

	function reset() {
		if (rateTimer) clearInterval(rateTimer);
		rateTimer = null;
		recorder = null;
		feed = '';
		queue = [];
		seq = 0;
		waiting.value = 0;
		uploadKbit.value = 0;
		state.value = 'idle';
	}

	function fail(why: string) {
		if (state.value === 'idle') return;
		error.value = why;
		const id = feed;
		if (recorder && recorder.state !== 'inactive') recorder.stop();
		reset();
		if (id) void $fetch(`/api/studio/sessions/${id}`, { method: 'DELETE' }).catch(() => {});
	}

	async function send(piece: Blob, number: number): Promise<void> {
		for (let attempt = 0; ; attempt++) {
			try {
				const answer = await $fetch<FeedStatus>(`/api/studio/sessions/${feed}`, {
					method: 'POST',
					query: { seq: number },
					body: piece,
					headers: { 'Content-Type': 'application/octet-stream' },
				});
				progress.value = answer.progress;
				return;
			} catch (e: unknown) {
				const status = (e as FetchFailure)?.statusCode ?? 0;
				// The server said no: repeating the piece will not change its mind.
				if (status >= 400 && status < 500) throw e;
				if (attempt >= RETRIES) throw e;
				await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
			}
		}
	}

	async function pump() {
		if (pumping) return;
		pumping = true;
		try {
			while (queue.length !== 0 && feed !== '') {
				const piece = queue[0]!;
				await send(piece, seq);
				queue.shift();
				seq++;
				sentBytes += piece.size;
				waiting.value = queue.length;
			}
		} catch (e: unknown) {
			fail(message(e, t('The connection to the server was lost.')));
		} finally {
			pumping = false;
		}
	}

	/** Puts `stream` on air for the channel. False if it could not be started (see `error`). */
	async function start(channelid: string, quality: QualityId, stream: MediaStream): Promise<boolean> {
		if (state.value !== 'idle') return false;
		error.value = '';
		progress.value = emptyFeedProgress();

		const mimeType = typeof MediaRecorder === 'undefined' ? undefined : MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
		if (!mimeType) {
			error.value = t('This browser cannot record the programme. Use a current Chrome, Edge, Firefox or Safari.');
			return false;
		}

		state.value = 'starting';
		try {
			const answer = await $fetch<{ id: string }>('/api/studio/sessions', {
				method: 'POST',
				body: { channelid, quality },
				headers: await authorization(),
			});
			feed = answer.id;
		} catch (e: unknown) {
			error.value = message(e, t('The server did not accept the programme.'));
			reset();
			return false;
		}

		const q = QUALITIES[quality];
		// Recorded well above the final bitrate: the server encodes it again, and what is lost here is lost twice.
		recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: q.videoKbit * 2000, audioBitsPerSecond: 192_000 });
		recorder.addEventListener('dataavailable', (event) => {
			if (event.data.size === 0 || feed === '') return;
			queue.push(event.data);
			waiting.value = queue.length;
			if (queue.length > MAX_WAITING) {
				fail(t('The connection to the server is too slow for this picture quality.'));
				return;
			}
			void pump();
		});
		recorder.addEventListener('error', () => fail(t('The browser stopped recording the programme.')));
		recorder.start(PIECE_MS);

		sentBytes = 0;
		rateTimer = setInterval(() => {
			uploadKbit.value = Math.round((sentBytes * 8) / 1000 / 2);
			sentBytes = 0;
		}, 2000);

		state.value = 'sending';
		return true;
	}

	/** Takes the programme off air; what was recorded up to now is still sent. */
	async function stop(): Promise<void> {
		if (state.value !== 'sending') return;
		state.value = 'stopping';

		const active = recorder;
		if (active && active.state !== 'inactive') {
			await new Promise<void>((resolve) => {
				active.addEventListener('stop', () => resolve(), { once: true });
				active.stop();
			});
		}

		// The last pieces, but not for long: a stalled upload must not keep the button waiting.
		const deadline = Date.now() + 4000;
		while ((queue.length !== 0 || pumping) && Date.now() < deadline && state.value === 'stopping') {
			await new Promise((resolve) => setTimeout(resolve, 100));
		}
		if (state.value !== 'stopping') return;

		const id = feed;
		reset();
		await $fetch(`/api/studio/sessions/${id}`, { method: 'DELETE' }).catch(() => {});
	}

	onBeforeUnmount(() => {
		if (state.value !== 'idle') {
			const id = feed;
			if (recorder && recorder.state !== 'inactive') recorder.stop();
			reset();
			if (id) void $fetch(`/api/studio/sessions/${id}`, { method: 'DELETE' }).catch(() => {});
		}
	});

	return {
		state: readonly(state),
		error: readonly(error),
		progress: readonly(progress),
		waiting: readonly(waiting),
		uploadKbit: readonly(uploadKbit),
		status,
		start,
		stop,
	};
}
