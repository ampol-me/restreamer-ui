// What the Studio remembers for a channel between visits (kept in the browser): the look of the
// programme — layout, graphics, saved scenes — and the picture quality. Devices are not part of
// it: they are chosen again each time, because the browser asks for them each time.
import { isLayout, type LayoutId } from './layout';

export const QUALITIES = {
	'720p': { width: 1280, height: 720, fps: 30, videoKbit: 3500, audioKbit: 128 },
	'1080p': { width: 1920, height: 1080, fps: 30, videoKbit: 6000, audioKbit: 160 },
} as const;
export type QualityId = keyof typeof QUALITIES;
export type Quality = (typeof QUALITIES)[QualityId];

export const isQuality = (value: unknown): value is QualityId => typeof value === 'string' && Object.hasOwn(QUALITIES, value);

export const CORNERS = ['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const;
export type Corner = (typeof CORNERS)[number];

export interface LowerThird {
	show: boolean;
	name: string;
	title: string;
}

export interface Banner {
	show: boolean;
	text: string;
	/** Scrolls through the picture instead of standing still. */
	ticker: boolean;
}

export interface Scene {
	id: string;
	name: string;
	layout: LayoutId;
	/** Sources on stage when the scene was saved; those still present come back with it. */
	stage: string[];
	logo: boolean;
	lowerThird: LowerThird;
	banner: Banner;
}

export interface StudioSetup {
	layout: LayoutId;
	quality: QualityId;
	/** `image`: a data: URL, '' for none. `size`: width in percent of the picture. */
	logo: { show: boolean; image: string; corner: Corner; size: number };
	lowerThird: LowerThird;
	banner: Banner;
	/** Picture behind the sources (a data: URL), '' for the plain backdrop. */
	background: string;
	scenes: Scene[];
}

export const MAX_SCENES = 12;
export const MAX_TEXT = 120;
// localStorage holds about 5 MB per site: two pictures have to fit with room to spare.
export const MAX_IMAGE_CHARS = 1_500_000;

export const defaultSetup = (): StudioSetup => ({
	layout: 'solo',
	quality: '720p',
	logo: { show: false, image: '', corner: 'top-right', size: 12 },
	lowerThird: { show: false, name: '', title: '' },
	banner: { show: false, text: '', ticker: false },
	background: '',
	scenes: [],
});

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const text = (value: unknown, max = MAX_TEXT) => (typeof value === 'string' ? value.slice(0, max) : '');
const flag = (value: unknown) => value === true;

/** Only pictures the canvas can draw without a network request are kept. */
export const isImageData = (value: unknown): value is string =>
	typeof value === 'string' && value.length <= MAX_IMAGE_CHARS && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value);

const lowerThird = (value: unknown): LowerThird => {
	const v = isObject(value) ? value : {};
	return { show: flag(v.show), name: text(v.name), title: text(v.title) };
};

const banner = (value: unknown): Banner => {
	const v = isObject(value) ? value : {};
	return { show: flag(v.show), text: text(v.text, 300), ticker: flag(v.ticker) };
};

function scene(value: unknown): Scene | null {
	if (!isObject(value)) return null;
	const id = text(value.id, 40);
	const name = text(value.name, 40).trim();
	if (!id || !name) return null;

	return {
		id,
		name,
		layout: isLayout(value.layout) ? value.layout : 'solo',
		stage: Array.isArray(value.stage) ? value.stage.filter((s): s is string => typeof s === 'string' && s.length <= 300).slice(0, 12) : [],
		logo: flag(value.logo),
		lowerThird: lowerThird(value.lowerThird),
		banner: banner(value.banner),
	};
}

/** Whatever was stored (or nothing) as a complete setup. */
export function sanitizeSetup(value: unknown): StudioSetup {
	const base = defaultSetup();
	if (!isObject(value)) return base;

	const logo = isObject(value.logo) ? value.logo : {};
	const size = Number(logo.size);
	const seen = new Set<string>();

	return {
		layout: isLayout(value.layout) ? value.layout : base.layout,
		quality: isQuality(value.quality) ? value.quality : base.quality,
		logo: {
			show: flag(logo.show),
			image: isImageData(logo.image) ? logo.image : '',
			corner: CORNERS.includes(logo.corner as Corner) ? (logo.corner as Corner) : base.logo.corner,
			size: Number.isFinite(size) ? Math.min(30, Math.max(5, Math.round(size))) : base.logo.size,
		},
		lowerThird: lowerThird(value.lowerThird),
		banner: banner(value.banner),
		background: isImageData(value.background) ? value.background : '',
		scenes: (Array.isArray(value.scenes) ? value.scenes : [])
			.map(scene)
			.filter((s): s is Scene => s !== null && !seen.has(s.id) && seen.add(s.id) !== undefined)
			.slice(0, MAX_SCENES),
	};
}

/** The current look as a scene to come back to. */
export function captureScene(setup: StudioSetup, stage: string[], id: string, name: string): Scene {
	return {
		id,
		name: name.trim().slice(0, 40),
		layout: setup.layout,
		stage: [...stage],
		logo: setup.logo.show,
		lowerThird: { ...setup.lowerThird },
		banner: { ...setup.banner },
	};
}

/**
 * Switches to a scene. Of its sources those that are still `available` go on stage, in the
 * scene's order; if none of them is, the stage stays as it is rather than going empty on air.
 */
export function applyScene(setup: StudioSetup, saved: Scene, stage: string[], available: string[]): { setup: StudioSetup; stage: string[] } {
	const present = saved.stage.filter((id) => available.includes(id));

	return {
		setup: {
			...setup,
			layout: saved.layout,
			logo: { ...setup.logo, show: saved.logo },
			lowerThird: { ...saved.lowerThird },
			banner: { ...saved.banner },
		},
		stage: present.length !== 0 ? present : stage,
	};
}

export const setupKey = (channelid: string) => `studio:${channelid}`;
