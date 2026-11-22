import { layoutTiles, placeSource, type Rect, type Tile } from '#shared/studio/layout';
import { QUALITIES, type StudioSetup } from '#shared/studio/setup';

export type StudioSourceKind = 'camera' | 'screen' | 'image' | 'video' | 'mic';

export interface StudioSource {
	id: string;
	kind: StudioSourceKind;
	label: string;
	/** Has a picture that can go on stage. */
	video: boolean;
	/** Has sound that goes into the mix. */
	audio: boolean;
	volume: number;
	muted: boolean;
	/** Video files only. */
	paused: boolean;
}

export type StudioFailure = 'denied' | 'missing' | 'busy' | 'unsupported' | 'unreadable';

export class StudioError extends Error {
	constructor(public reason: StudioFailure) {
		super(reason);
	}
}

export interface StudioDevice {
	id: string;
	label: string;
}

interface Runtime {
	picture?: HTMLVideoElement | HTMLImageElement;
	stream?: MediaStream;
	gain?: GainNode;
	analyser?: AnalyserNode;
	nodes: AudioNode[];
	url?: string;
}

// On-air graphics keep the brand's fixed colours whatever theme the Studio itself is shown in
// (design/phila/PHILA-DESIGN.md, LowerThird).
const NAVY = '#28428c';
const GOLD = '#e8b774';
const INK = '#141b2e';
const INK_MUTED = '#5b6275';
const WHITE = '#ffffff';
const BACKDROP = '#0f1524';
const EMPTY_TILE = '#172038';
const FONT = '"IBM Plex Sans Thai", "IBM Plex Sans", system-ui, sans-serif';

const MAX_ON_STAGE = 6;
const GRAPHIC_IN_MS = 350;
const GRAPHIC_OUT_MS = 250;
const TICKER_SPEED = 90;

const failure = (e: unknown): StudioError => {
	const name = (e as { name?: string })?.name ?? '';
	if (name === 'NotAllowedError' || name === 'SecurityError') return new StudioError('denied');
	if (name === 'NotFoundError' || name === 'OverconstrainedError') return new StudioError('missing');
	if (name === 'NotReadableError' || name === 'AbortError') return new StudioError('busy');
	return new StudioError('unsupported');
};

/**
 * The Studio's mixer: takes cameras, microphones, shared screens, pictures and video files, and
 * makes one programme of them — the picture on a canvas (layout and graphics as `setup` says),
 * the sound through Web Audio. `output()` is that programme as a stream to record.
 */
export function useStudioEngine(setup: Ref<StudioSetup>) {
	const sources = ref<StudioSource[]>([]);
	/** Sources on stage, in the order the layout places them (the first is the main one). */
	const stage = ref<string[]>([]);
	const levels = reactive<Record<string, number>>({});
	const programLevel = ref(0);
	const cameras = ref<StudioDevice[]>([]);
	const microphones = ref<StudioDevice[]>([]);

	const runtime = new Map<string, Runtime>();
	const canvas = document.createElement('canvas');
	const context = canvas.getContext('2d', { alpha: false })!;

	let audio: AudioContext | null = null;
	let master: GainNode | null = null;
	let masterAnalyser: AnalyserNode | null = null;
	let destination: MediaStreamAudioDestinationNode | null = null;
	let programme: MediaStream | null = null;
	let counter = 0;

	const backgroundImage = new Image();
	const logoImage = new Image();
	const markImage = new Image();
	markImage.src = `${useRuntimeConfig().app.baseURL}brand/phila-mark-reverse.svg`;

	const quality = computed(() => QUALITIES[setup.value.quality]);

	watch(
		quality,
		(q) => {
			canvas.width = q.width;
			canvas.height = q.height;
		},
		{ immediate: true },
	);
	watch(
		() => setup.value.background,
		(src) => (backgroundImage.src = src),
		{ immediate: true },
	);
	watch(
		() => setup.value.logo.image,
		(src) => (logoImage.src = src),
		{ immediate: true },
	);

	// Sound

	function ensureAudio(): AudioContext {
		if (!audio) {
			audio = new AudioContext({ sampleRate: 48000, latencyHint: 'interactive' });
			master = audio.createGain();
			masterAnalyser = audio.createAnalyser();
			masterAnalyser.fftSize = 1024;
			destination = audio.createMediaStreamDestination();
			// Several sources at full level add up to more than full level: held just below it
			// instead of clipping on air.
			const limiter = audio.createDynamicsCompressor();
			limiter.threshold.value = -3;
			limiter.knee.value = 0;
			limiter.ratio.value = 20;
			limiter.attack.value = 0.003;
			limiter.release.value = 0.1;
			master.connect(limiter);
			limiter.connect(masterAnalyser);
			limiter.connect(destination);

			// Keeps the programme's sound track running while nothing is plugged in.
			const silence = audio.createConstantSource();
			silence.offset.value = 0;
			silence.connect(master);
			silence.start();
		}
		void audio.resume();
		return audio;
	}

	function plug(id: string, node: AudioNode, monitor: boolean) {
		const ctx = ensureAudio();
		const entry = runtime.get(id)!;
		const gain = ctx.createGain();
		const analyser = ctx.createAnalyser();
		analyser.fftSize = 1024;
		node.connect(gain);
		gain.connect(analyser);
		gain.connect(master!);
		// A video file is also heard in the Studio itself; microphones and screens are not, they would echo.
		if (monitor) gain.connect(ctx.destination);
		entry.gain = gain;
		entry.analyser = analyser;
		entry.nodes.push(node, gain, analyser);
		applyGains();
	}

	// Microphones are always in the mix; the sound of a screen or a video file only while it is on stage.
	function applyGains() {
		for (const source of sources.value) {
			const gain = runtime.get(source.id)?.gain;
			if (!gain || !audio) continue;
			const audible = !source.muted && (source.kind === 'mic' || stage.value.includes(source.id));
			gain.gain.setTargetAtTime(audible ? source.volume : 0, audio.currentTime, 0.015);
		}
	}

	watch([sources, stage], applyGains, { deep: true });

	const buffer = new Float32Array(1024);
	const peak = (analyser: AnalyserNode | null | undefined) => {
		if (!analyser) return 0;
		analyser.getFloatTimeDomainData(buffer);
		let max = 0;
		for (const sample of buffer) max = Math.max(max, Math.abs(sample));
		return Math.min(1, max);
	};

	function meter() {
		for (const source of sources.value) {
			if (!source.audio) continue;
			// Falls slower than it rises, so short peaks can be seen.
			levels[source.id] = Math.max(peak(runtime.get(source.id)?.analyser), (levels[source.id] ?? 0) * 0.6);
		}
		programLevel.value = Math.max(peak(masterAnalyser), programLevel.value * 0.6);
	}

	// Sources

	function register(source: StudioSource, entry: Runtime) {
		runtime.set(source.id, entry);
		sources.value = [...sources.value, source];
		if (source.video) putOnStage(source.id);
	}

	const videoElement = (stream?: MediaStream) => {
		const element = document.createElement('video');
		element.muted = true;
		element.playsInline = true;
		if (stream) {
			element.srcObject = stream;
			void element.play().catch(() => {});
		}
		return element;
	};

	async function refreshDevices() {
		if (!navigator.mediaDevices?.enumerateDevices) return;
		const all = await navigator.mediaDevices.enumerateDevices();
		const list = (kind: MediaDeviceKind, name: string) =>
			all.filter((d) => d.kind === kind && d.deviceId !== '').map((d, i) => ({ id: d.deviceId, label: d.label || `${name} ${i + 1}` }));
		cameras.value = list('videoinput', 'Camera');
		microphones.value = list('audioinput', 'Microphone');
	}

	async function capture(constraints: MediaStreamConstraints): Promise<MediaStream> {
		if (!navigator.mediaDevices?.getUserMedia) throw new StudioError('unsupported');
		try {
			return await navigator.mediaDevices.getUserMedia(constraints);
		} catch (e: unknown) {
			throw failure(e);
		}
	}

	async function addCamera(deviceId?: string): Promise<void> {
		const q = quality.value;
		const stream = await capture({
			video: {
				deviceId: deviceId ? { exact: deviceId } : undefined,
				width: { ideal: q.width },
				height: { ideal: q.height },
				frameRate: { ideal: q.fps },
			},
		});
		const track = stream.getVideoTracks()[0]!;
		const id = `camera:${track.getSettings().deviceId ?? deviceId ?? ++counter}`;
		if (runtime.has(id)) {
			track.stop();
			return;
		}
		track.addEventListener('ended', () => remove(id));
		register(
			{ id, kind: 'camera', label: track.label || 'Camera', video: true, audio: false, volume: 1, muted: false, paused: false },
			{ picture: videoElement(stream), stream, nodes: [] },
		);
		void refreshDevices();
	}

	async function addMicrophone(deviceId?: string): Promise<void> {
		const stream = await capture({
			audio: { deviceId: deviceId ? { exact: deviceId } : undefined, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
		});
		const track = stream.getAudioTracks()[0]!;
		const id = `mic:${track.getSettings().deviceId ?? deviceId ?? ++counter}`;
		if (runtime.has(id)) {
			track.stop();
			return;
		}
		track.addEventListener('ended', () => remove(id));
		register(
			{ id, kind: 'mic', label: track.label || 'Microphone', video: false, audio: true, volume: 1, muted: false, paused: false },
			{ stream, nodes: [] },
		);
		plug(id, ensureAudio().createMediaStreamSource(stream), false);
		void refreshDevices();
	}

	async function addScreen(): Promise<void> {
		if (!navigator.mediaDevices?.getDisplayMedia) throw new StudioError('unsupported');
		let stream: MediaStream;
		try {
			stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: { ideal: quality.value.fps } }, audio: true });
		} catch (e: unknown) {
			throw failure(e);
		}
		const track = stream.getVideoTracks()[0]!;
		const id = `screen:${++counter}`;
		const hasAudio = stream.getAudioTracks().length !== 0;
		// The browser's own "Stop sharing" ends the track.
		track.addEventListener('ended', () => remove(id));
		register(
			{ id, kind: 'screen', label: track.label || 'Screen', video: true, audio: hasAudio, volume: 1, muted: false, paused: false },
			{ picture: videoElement(stream), stream, nodes: [] },
		);
		if (hasAudio) plug(id, ensureAudio().createMediaStreamSource(stream), false);
	}

	async function addImage(file: File): Promise<void> {
		const url = URL.createObjectURL(file);
		const picture = new Image();
		picture.src = url;
		try {
			await picture.decode();
		} catch {
			URL.revokeObjectURL(url);
			throw new StudioError('unreadable');
		}
		register(
			{ id: `image:${++counter}`, kind: 'image', label: file.name, video: true, audio: false, volume: 1, muted: false, paused: false },
			{ picture, url, nodes: [] },
		);
	}

	async function addVideo(file: File): Promise<void> {
		const url = URL.createObjectURL(file);
		const picture = document.createElement('video');
		picture.playsInline = true;
		picture.loop = true;
		picture.preload = 'auto';
		picture.src = url;
		try {
			await new Promise<void>((resolve, reject) => {
				picture.addEventListener('loadeddata', () => resolve(), { once: true });
				picture.addEventListener('error', () => reject(new Error('unreadable')), { once: true });
			});
		} catch {
			URL.revokeObjectURL(url);
			throw new StudioError('unreadable');
		}

		const id = `video:${++counter}`;
		const sync = () => patch(id, { paused: picture.paused });
		picture.addEventListener('play', sync);
		picture.addEventListener('pause', sync);

		register({ id, kind: 'video', label: file.name, video: true, audio: true, volume: 1, muted: false, paused: true }, { picture, url, nodes: [] });
		plug(id, ensureAudio().createMediaElementSource(picture), true);
	}

	function patch(id: string, values: Partial<StudioSource>) {
		sources.value = sources.value.map((s) => (s.id === id ? { ...s, ...values } : s));
	}

	function remove(id: string) {
		const entry = runtime.get(id);
		if (!entry) return;
		runtime.delete(id);

		entry.stream?.getTracks().forEach((track) => track.stop());
		entry.nodes.forEach((node) => node.disconnect());
		if (entry.picture instanceof HTMLVideoElement) {
			entry.picture.pause();
			entry.picture.srcObject = null;
			entry.picture.removeAttribute('src');
		}
		if (entry.url) URL.revokeObjectURL(entry.url);

		stage.value = stage.value.filter((s) => s !== id);
		sources.value = sources.value.filter((s) => s.id !== id);
		// eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- keyed by source id
		delete levels[id];
	}

	// Stage

	function putOnStage(id: string) {
		const source = sources.value.find((s) => s.id === id);
		if (!source?.video || stage.value.includes(id) || stage.value.length >= MAX_ON_STAGE) return;

		// A shared screen is what the programme is about: it takes the main place.
		stage.value = source.kind === 'screen' ? [id, ...stage.value] : [...stage.value, id];

		// The one-source layout would hide what was just added.
		if (stage.value.length > 1 && setup.value.layout === 'solo') {
			setup.value = { ...setup.value, layout: source.kind === 'screen' ? 'spotlight' : 'split' };
		}
	}

	function toggleStage(id: string) {
		if (stage.value.includes(id)) {
			stage.value = stage.value.filter((s) => s !== id);
		} else {
			putOnStage(id);
		}
	}

	/** Gives a source on stage the main place. */
	function bringFirst(id: string) {
		if (stage.value.includes(id)) stage.value = [id, ...stage.value.filter((s) => s !== id)];
	}

	function setStage(ids: string[]) {
		stage.value = ids.filter((id) => sources.value.some((s) => s.id === id && s.video)).slice(0, MAX_ON_STAGE);
	}

	const setVolume = (id: string, volume: number) => patch(id, { volume: Math.min(1.5, Math.max(0, volume)) });
	const setMuted = (id: string, muted: boolean) => patch(id, { muted });

	function togglePlayback(id: string) {
		const picture = runtime.get(id)?.picture;
		if (!(picture instanceof HTMLVideoElement)) return;
		ensureAudio();
		if (picture.paused) void picture.play().catch(() => {});
		else picture.pause();
	}

	function restartPlayback(id: string) {
		const picture = runtime.get(id)?.picture;
		if (picture instanceof HTMLVideoElement) picture.currentTime = 0;
	}

	// Picture

	const pictureSize = (picture: HTMLVideoElement | HTMLImageElement | undefined): [number, number] =>
		picture instanceof HTMLVideoElement ? [picture.videoWidth, picture.videoHeight] : picture ? [picture.naturalWidth, picture.naturalHeight] : [0, 0];

	const ready = (image: HTMLImageElement) => image.complete && image.naturalWidth > 0;

	function roundedPath(ctx: CanvasRenderingContext2D, rect: Rect, radius: number) {
		ctx.beginPath();
		ctx.roundRect(rect.x, rect.y, rect.w, rect.h, radius);
	}

	function drawPicture(ctx: CanvasRenderingContext2D, id: string, rect: Rect, radius: number) {
		const source = sources.value.find((s) => s.id === id);
		const picture = runtime.get(id)?.picture;
		const [w, h] = pictureSize(picture);
		// A screen or a picture is shown whole; a camera fills its tile.
		const whole = source?.kind === 'screen' || source?.kind === 'image';
		const place = placeSource(w, h, rect, whole ? 'contain' : 'cover');

		ctx.save();
		roundedPath(ctx, rect, radius);
		ctx.clip();
		ctx.fillStyle = whole ? '#000000' : EMPTY_TILE;
		ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
		if (picture && place) {
			ctx.drawImage(picture, place.sx, place.sy, place.sw, place.sh, place.dx, place.dy, place.dw, place.dh);
		}
		ctx.restore();
	}

	function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
		if (ctx.measureText(text).width <= maxWidth) return text;
		let cut = text;
		while (cut.length > 1 && ctx.measureText(cut + '…').width > maxWidth) cut = cut.slice(0, -1);
		return cut + '…';
	}

	// How far each graphic is in (0 = out, 1 = in); moved towards its switch every frame.
	const shown = { logo: 0, lowerThird: 0, banner: 0 };
	let lastFrame = 0;

	const approach = (value: number, on: boolean, dt: number) => (on ? Math.min(1, value + dt / GRAPHIC_IN_MS) : Math.max(0, value - dt / GRAPHIC_OUT_MS));
	const ease = (t: number) => 1 - Math.pow(1 - t, 3);

	const bannerHeight = (H: number) => Math.round(52 * (H / 720));

	function drawGraphics(ctx: CanvasRenderingContext2D, W: number, H: number, now: number) {
		const s = H / 720;
		const { logo, lowerThird, banner } = setup.value;

		const bannerIn = ease(shown.banner);
		const bannerH = bannerHeight(H);
		const bannerTop = H - bannerH * bannerIn;

		if (shown.lowerThird > 0 && lowerThird.name.trim() !== '') {
			const t = ease(shown.lowerThird);
			const hasTitle = lowerThird.title.trim() !== '';
			const h = Math.round((hasTitle ? 84 : 64) * s);
			const pad = Math.round(24 * s);
			const edge = Math.round(6 * s);
			const x = Math.round(W * 0.06) - (1 - t) * 40 * s;
			const y = Math.min(H - Math.round(H * 0.1), bannerTop - Math.round(16 * s)) - h;
			const maxText = W * 0.55;

			ctx.save();
			ctx.globalAlpha = t;
			ctx.textBaseline = 'alphabetic';

			ctx.font = `600 ${Math.round(30 * s)}px ${FONT}`;
			const name = fitText(ctx, lowerThird.name.trim(), maxText);
			const nameWidth = ctx.measureText(name).width;
			ctx.font = `400 ${Math.round(20 * s)}px ${FONT}`;
			const title = hasTitle ? fitText(ctx, lowerThird.title.trim(), maxText) : '';
			const plate = Math.ceil(Math.max(nameWidth, ctx.measureText(title).width)) + 2 * pad;

			roundedPath(ctx, { x, y, w: h + plate + edge, h }, Math.round(6 * s));
			ctx.clip();

			ctx.fillStyle = NAVY;
			ctx.fillRect(x, y, h, h);
			if (ready(markImage)) {
				const inset = h * 0.22;
				ctx.drawImage(markImage, x + inset, y + inset, h - 2 * inset, h - 2 * inset);
			}
			ctx.fillStyle = WHITE;
			ctx.fillRect(x + h, y, plate, h);
			ctx.fillStyle = GOLD;
			ctx.fillRect(x + h + plate, y, edge, h);

			ctx.fillStyle = INK;
			ctx.font = `600 ${Math.round(30 * s)}px ${FONT}`;
			ctx.fillText(name, x + h + pad, y + (hasTitle ? h * 0.46 : h * 0.64));
			if (hasTitle) {
				ctx.fillStyle = INK_MUTED;
				ctx.font = `400 ${Math.round(20 * s)}px ${FONT}`;
				ctx.fillText(title, x + h + pad, y + h * 0.8);
			}
			ctx.restore();
		}

		if (shown.banner > 0 && banner.text.trim() !== '') {
			const text = banner.text.trim().replace(/\s+/g, ' ');
			const pad = Math.round(32 * s);

			ctx.save();
			ctx.fillStyle = NAVY;
			ctx.fillRect(0, bannerTop, W, bannerH);
			ctx.fillStyle = GOLD;
			ctx.fillRect(0, bannerTop, W, Math.round(4 * s));

			ctx.beginPath();
			ctx.rect(0, bannerTop, W, bannerH);
			ctx.clip();
			ctx.fillStyle = WHITE;
			ctx.font = `500 ${Math.round(24 * s)}px ${FONT}`;
			ctx.textBaseline = 'middle';
			const baseline = bannerTop + bannerH / 2 + 2 * s;

			if (banner.ticker) {
				const stride = ctx.measureText(text).width + Math.round(120 * s);
				const offset = ((now / 1000) * TICKER_SPEED * s) % stride;
				for (let x = W - offset - stride; x < W; x += stride) {
					if (x + stride > 0) ctx.fillText(text, x, baseline);
				}
			} else {
				ctx.fillText(fitText(ctx, text, W - 2 * pad), pad, baseline);
			}
			ctx.restore();
		}

		if (shown.logo > 0 && ready(logoImage)) {
			const w = Math.round((W * logo.size) / 100);
			const h = Math.round((w * logoImage.naturalHeight) / logoImage.naturalWidth);
			const marginX = Math.round(W * 0.04);
			const marginY = Math.round(H * 0.06);
			const x = logo.corner.endsWith('left') ? marginX : W - marginX - w;
			const y = logo.corner.startsWith('top') ? marginY : bannerTop - marginY - h;

			ctx.save();
			ctx.globalAlpha = ease(shown.logo);
			ctx.drawImage(logoImage, x, y, w, h);
			ctx.restore();
		}
	}

	function draw(now: number) {
		const { width: W, height: H } = canvas;
		const dt = lastFrame === 0 ? 0 : Math.min(200, now - lastFrame);
		lastFrame = now;

		shown.logo = approach(shown.logo, setup.value.logo.show, dt);
		shown.lowerThird = approach(shown.lowerThird, setup.value.lowerThird.show, dt);
		shown.banner = approach(shown.banner, setup.value.banner.show, dt);

		context.fillStyle = BACKDROP;
		context.fillRect(0, 0, W, H);
		if (ready(backgroundImage)) {
			const place = placeSource(backgroundImage.naturalWidth, backgroundImage.naturalHeight, { x: 0, y: 0, w: W, h: H }, 'cover')!;
			context.drawImage(backgroundImage, place.sx, place.sy, place.sw, place.sh, place.dx, place.dy, place.dw, place.dh);
		}

		const onStage = stage.value.filter((id) => runtime.has(id));
		const tiles: Tile[] = layoutTiles(setup.value.layout, onStage.length, { width: W, height: H });
		// The small pictures of picture-in-picture move up out of the banner's way.
		const lift = setup.value.layout === 'pip' ? Math.round(bannerHeight(H) * ease(shown.banner)) : 0;
		tiles.forEach((tile, i) => drawPicture(context, onStage[i]!, tile.main ? tile : { ...tile, y: tile.y - lift }, tile.radius));

		drawGraphics(context, W, H, now);
	}

	/** Draws a source into a small canvas of its own (the source list's thumbnails). */
	function drawThumbnail(id: string, target: HTMLCanvasElement) {
		const ctx = target.getContext('2d');
		if (ctx) drawPicture(ctx, id, { x: 0, y: 0, w: target.width, h: target.height }, 0);
	}

	// A hidden tab stops requestAnimationFrame and slows its timers to one a second, which would
	// freeze the programme whenever the presenter looks at another tab. A worker's timer keeps time.
	const ticker = new Worker(
		URL.createObjectURL(
			new Blob(['let t; onmessage = (e) => { clearInterval(t); if (e.data > 0) t = setInterval(() => postMessage(0), 1000 / e.data); };'], {
				type: 'text/javascript',
			}),
		),
	);
	let frame = 0;
	ticker.onmessage = () => {
		draw(performance.now());
		if (++frame % 2 === 0) meter();
	};
	watch(quality, (q) => ticker.postMessage(q.fps), { immediate: true });

	void document.fonts?.load(`600 30px ${FONT}`);

	/** The programme as a stream: the canvas and the mix. Call from a click: browsers start sound only then. */
	function output(): MediaStream {
		ensureAudio();
		if (!programme) {
			programme = new MediaStream([...canvas.captureStream(quality.value.fps).getVideoTracks(), ...destination!.stream.getAudioTracks()]);
		}
		return programme;
	}

	function dispose() {
		ticker.terminate();
		for (const id of [...runtime.keys()]) remove(id);
		programme?.getTracks().forEach((track) => track.stop());
		programme = null;
		void audio?.close();
		audio = null;
		navigator.mediaDevices?.removeEventListener?.('devicechange', refreshDevices);
	}

	navigator.mediaDevices?.addEventListener?.('devicechange', refreshDevices);
	void refreshDevices();

	return {
		canvas,
		sources: readonly(sources),
		stage: readonly(stage),
		levels: readonly(levels),
		programLevel: readonly(programLevel),
		cameras: readonly(cameras),
		microphones: readonly(microphones),
		refreshDevices,
		addCamera,
		addMicrophone,
		addScreen,
		addImage,
		addVideo,
		remove,
		toggleStage,
		bringFirst,
		setStage,
		setVolume,
		setMuted,
		togglePlayback,
		restartPlayback,
		drawThumbnail,
		output,
		dispose,
	};
}

export type StudioEngine = ReturnType<typeof useStudioEngine>;
