// Where the sources on the Studio's stage are drawn in the programme picture.

export const LAYOUTS = ['solo', 'split', 'pip', 'spotlight', 'grid'] as const;
export type LayoutId = (typeof LAYOUTS)[number];

export const isLayout = (value: unknown): value is LayoutId => LAYOUTS.includes(value as LayoutId);

export interface Frame {
	width: number;
	height: number;
}

export interface Rect {
	x: number;
	y: number;
	w: number;
	h: number;
}

/** The place of one source. `main` marks the tile a shared screen should be shown whole in. */
export interface Tile extends Rect {
	radius: number;
	main: boolean;
}

const ASPECT = 16 / 9;
// More than this many columns side by side leaves tiles too narrow to read a face in.
const MAX_COLUMNS = 4;
const MAX_INSETS = 3;

/**
 * Tiles for the first sources on stage, in stage order. A layout shows as many sources as it has
 * room for: the result can be shorter than `count` (solo shows one, picture-in-picture four).
 */
export function layoutTiles(layout: LayoutId, count: number, frame: Frame): Tile[] {
	const { width: W, height: H } = frame;
	if (count <= 0) return [];

	const full: Tile = { x: 0, y: 0, w: W, h: H, radius: 0, main: true };
	if (layout === 'solo' || count === 1) return [full];

	const pad = Math.round(H * 0.03);
	const gap = Math.round(H * 0.02);
	const radius = Math.round(H * 0.017);

	if (layout === 'pip') {
		const w = Math.round(W * 0.22);
		const h = Math.round(w / ASPECT);
		const insets = Math.min(count - 1, MAX_INSETS);
		const tiles: Tile[] = [full];
		for (let i = 0; i < insets; i++) {
			tiles.push({ x: W - pad - w, y: H - pad - h - i * (h + gap), w, h, radius, main: false });
		}
		return tiles;
	}

	if (layout === 'spotlight') {
		const sideW = Math.round(W * 0.22);
		const sideH = Math.round(sideW / ASPECT);
		const room = Math.max(1, Math.floor((H - 2 * pad + gap) / (sideH + gap)));
		const sides = Math.min(count - 1, room);
		const tiles: Tile[] = [{ x: pad, y: pad, w: W - 2 * pad - gap - sideW, h: H - 2 * pad, radius, main: true }];
		for (let i = 0; i < sides; i++) {
			tiles.push({ x: W - pad - sideW, y: pad + i * (sideH + gap), w: sideW, h: sideH, radius, main: false });
		}
		return tiles;
	}

	if (layout === 'split' && count <= MAX_COLUMNS) {
		const w = Math.floor((W - 2 * pad - (count - 1) * gap) / count);
		const h = Math.min(H - 2 * pad, Math.round((w * 3) / 4));
		const y = Math.round((H - h) / 2);
		return Array.from({ length: count }, (_, i) => ({ x: pad + i * (w + gap), y, w, h, radius, main: false }));
	}

	// grid, and a split with more sources than fit side by side
	const cols = Math.ceil(Math.sqrt(count));
	const rows = Math.ceil(count / cols);
	const cellW = (W - 2 * pad - (cols - 1) * gap) / cols;
	const cellH = (H - 2 * pad - (rows - 1) * gap) / rows;
	const w = Math.floor(Math.min(cellW, cellH * ASPECT));
	const h = Math.floor(w / ASPECT);
	const top = Math.round((H - rows * h - (rows - 1) * gap) / 2);

	return Array.from({ length: count }, (_, i) => {
		const row = Math.floor(i / cols);
		const inRow = row === rows - 1 ? count - row * cols : cols;
		// A last row that is not full is centred.
		const left = Math.round((W - inRow * w - (inRow - 1) * gap) / 2);
		return { x: left + (i % cols) * (w + gap), y: top + row * (h + gap), w, h, radius, main: false };
	});
}

export interface Placement {
	sx: number;
	sy: number;
	sw: number;
	sh: number;
	dx: number;
	dy: number;
	dw: number;
	dh: number;
}

/**
 * How a picture of `sourceW`×`sourceH` goes into `rect` — the arguments of drawImage().
 * cover: fills the rectangle, cropping the picture around its centre.
 * contain: shows the whole picture, centred, leaving the rest of the rectangle free.
 */
export function placeSource(sourceW: number, sourceH: number, rect: Rect, mode: 'cover' | 'contain'): Placement | null {
	if (!(sourceW > 0) || !(sourceH > 0) || !(rect.w > 0) || !(rect.h > 0)) return null;

	const sourceAspect = sourceW / sourceH;
	const rectAspect = rect.w / rect.h;

	if (mode === 'cover') {
		if (sourceAspect > rectAspect) {
			const sw = sourceH * rectAspect;
			return { sx: (sourceW - sw) / 2, sy: 0, sw, sh: sourceH, dx: rect.x, dy: rect.y, dw: rect.w, dh: rect.h };
		}
		const sh = sourceW / rectAspect;
		return { sx: 0, sy: (sourceH - sh) / 2, sw: sourceW, sh, dx: rect.x, dy: rect.y, dw: rect.w, dh: rect.h };
	}

	if (sourceAspect > rectAspect) {
		const dh = rect.w / sourceAspect;
		return { sx: 0, sy: 0, sw: sourceW, sh: sourceH, dx: rect.x, dy: rect.y + (rect.h - dh) / 2, dw: rect.w, dh };
	}
	const dw = rect.h * sourceAspect;
	return { sx: 0, sy: 0, sw: sourceW, sh: sourceH, dx: rect.x + (rect.w - dw) / 2, dy: rect.y, dw, dh: rect.h };
}
