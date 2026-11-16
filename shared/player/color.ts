// Colour strings of the playersite settings. They are stored as CSS rgba() strings because the
// playersite template writes them into its stylesheet as they are.

export interface Rgba {
	r: number;
	g: number;
	b: number;
	a: number;
}

/** Port of hexToRGBA in legacy/src/misc/ColorPicker.js: #rgb and #rrggbb become rgba(), anything else is kept. */
export function hexToRGBA(value: string): string {
	const full = value.replace(/^#([a-f\d])([a-f\d])([a-f\d])$/i, (_m, r, g, b) => '#' + r + r + g + g + b + b);
	const result = /^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(full);

	return result ? `rgba(${parseInt(result[1]!, 16)},${parseInt(result[2]!, 16)},${parseInt(result[3]!, 16)},1)` : value;
}

/** Reads #rgb, #rrggbb, rgb() and rgba() (comma separated, alpha as a number). null for anything else. */
export function parseColor(value: string): Rgba | null {
	const match = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*(\d*\.?\d+)\s*)?\)$/i.exec(hexToRGBA(value.trim()));
	if (!match) {
		return null;
	}

	const [r, g, b] = [match[1]!, match[2]!, match[3]!].map(Number) as [number, number, number];
	const a = match[4] === undefined ? 1 : Number(match[4]);
	if (r > 255 || g > 255 || b > 255 || a > 1) {
		return null;
	}

	return { r, g, b, a };
}

/** The format the legacy picker (react-colorful's RgbaStringColorPicker) wrote. */
export function formatRgba({ r, g, b, a }: Rgba): string {
	return `rgba(${r}, ${g}, ${b}, ${Math.round(a * 100) / 100})`;
}

export function toHex({ r, g, b }: Rgba): string {
	return '#' + [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('');
}
