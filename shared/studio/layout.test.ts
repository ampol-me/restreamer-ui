import { describe, expect, test } from 'bun:test';

import { LAYOUTS, layoutTiles, placeSource, type Tile } from './layout';

const frame = { width: 1280, height: 720 };
const inside = (t: Tile) => t.x >= 0 && t.y >= 0 && t.x + t.w <= frame.width && t.y + t.h <= frame.height;
const overlap = (a: Tile, b: Tile) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

describe('stage layouts', () => {
	test('an empty stage has no tiles', () => {
		for (const layout of LAYOUTS) expect(layoutTiles(layout, 0, frame)).toEqual([]);
	});

	test('a single source fills the picture in every layout', () => {
		for (const layout of LAYOUTS) {
			expect(layoutTiles(layout, 1, frame)).toEqual([{ x: 0, y: 0, w: 1280, h: 720, radius: 0, main: true }]);
		}
	});

	test('solo shows only the first source', () => {
		expect(layoutTiles('solo', 4, frame)).toHaveLength(1);
	});

	test('every tile lies inside the picture', () => {
		for (const layout of LAYOUTS) {
			for (let count = 1; count <= 6; count++) {
				for (const tile of layoutTiles(layout, count, frame)) expect(inside(tile)).toBe(true);
			}
		}
	});

	test('side by side: equal tiles next to each other, none overlapping', () => {
		const tiles = layoutTiles('split', 3, frame);
		expect(tiles).toHaveLength(3);
		expect(new Set(tiles.map((t) => `${t.w}x${t.h}@${t.y}`)).size).toBe(1);
		expect(overlap(tiles[0]!, tiles[1]!) || overlap(tiles[1]!, tiles[2]!)).toBe(false);
	});

	test('side by side with more sources than fit in a row becomes a grid', () => {
		expect(layoutTiles('split', 5, frame)).toEqual(layoutTiles('grid', 5, frame));
	});

	test('picture in picture: the first fills the picture, up to three small ones lie on it', () => {
		const tiles = layoutTiles('pip', 6, frame);
		expect(tiles).toHaveLength(4);
		expect(tiles[0]).toMatchObject({ x: 0, y: 0, w: 1280, h: 720, main: true });
		for (const inset of tiles.slice(1)) {
			expect(inset.w).toBeLessThan(frame.width / 3);
			expect(overlap(tiles[0]!, inset)).toBe(true);
		}
		expect(overlap(tiles[1]!, tiles[2]!)).toBe(false);
	});

	test('main and side: the main tile is the larger one and nothing overlaps', () => {
		const tiles = layoutTiles('spotlight', 3, frame);
		expect(tiles).toHaveLength(3);
		expect(tiles[0]!.main).toBe(true);
		expect(tiles[0]!.w * tiles[0]!.h).toBeGreaterThan(4 * tiles[1]!.w * tiles[1]!.h);
		for (let a = 0; a < tiles.length; a++) {
			for (let b = a + 1; b < tiles.length; b++) expect(overlap(tiles[a]!, tiles[b]!)).toBe(false);
		}
	});

	test('main and side shows only as many side tiles as the height holds', () => {
		expect(layoutTiles('spotlight', 6, frame).length).toBeLessThan(6);
	});

	test('grid: 16:9 tiles, an incomplete last row is centred', () => {
		const tiles = layoutTiles('grid', 3, frame);
		expect(tiles).toHaveLength(3);
		for (const tile of tiles) expect(tile.w / tile.h).toBeCloseTo(16 / 9, 1);
		const last = tiles[2]!;
		expect(Math.abs(last.x + last.w / 2 - frame.width / 2)).toBeLessThanOrEqual(1);
	});

	test('tiles scale with the picture', () => {
		const small = layoutTiles('spotlight', 2, frame);
		const large = layoutTiles('spotlight', 2, { width: 1920, height: 1080 });
		expect(large[0]!.w / small[0]!.w).toBeCloseTo(1.5, 1);
	});
});

describe('placing a picture in a tile', () => {
	const rect = { x: 100, y: 50, w: 400, h: 400 };

	test('cover crops a wide picture at the sides and fills the tile', () => {
		expect(placeSource(1920, 1080, rect, 'cover')).toEqual({ sx: 420, sy: 0, sw: 1080, sh: 1080, dx: 100, dy: 50, dw: 400, dh: 400 });
	});

	test('cover crops a tall picture at top and bottom', () => {
		const place = placeSource(1080, 1920, rect, 'cover')!;
		expect(place).toMatchObject({ sx: 0, sy: 420, sw: 1080, sh: 1080 });
	});

	test('contain shows a wide picture whole, centred vertically', () => {
		expect(placeSource(1920, 1080, rect, 'contain')).toEqual({ sx: 0, sy: 0, sw: 1920, sh: 1080, dx: 100, dy: 137.5, dw: 400, dh: 225 });
	});

	test('contain shows a tall picture whole, centred horizontally', () => {
		const place = placeSource(1080, 1920, rect, 'contain')!;
		expect(place).toMatchObject({ dx: 187.5, dy: 50, dw: 225, dh: 400 });
	});

	test('a picture that has no size yet is not placed', () => {
		expect(placeSource(0, 0, rect, 'cover')).toBeNull();
		expect(placeSource(1920, 1080, { ...rect, w: 0 }, 'contain')).toBeNull();
	});
});
