// The viewer page is assembled from blocks placed in two regions. This is the stored form of
// a layout ("template"); the admin editor arranges it by drag and drop and saves presets of it.

export const blockTypes = ['header', 'player', 'channels', 'text', 'image', 'button', 'footer'] as const;
export type BlockType = (typeof blockTypes)[number];

export interface Block {
	id: string;
	type: BlockType;
	// Per-type settings, all optional strings/booleans (see blockDefaults).
	props: Record<string, string | boolean>;
}

export interface Template {
	// The wide column; on narrow screens the side column follows below it.
	main: Block[];
	side: Block[];
}

export interface Preset {
	id: string;
	name: string;
	template: Template;
}

/** The settings each block type understands, with their defaults. */
export const blockDefaults: Record<BlockType, Record<string, string | boolean>> = {
	header: { showLogo: true, subtitle: '' },
	player: { showTitle: true, showDescription: true, showShare: true },
	channels: { heading: '' },
	text: { heading: '', body: '' },
	image: { url: '', alt: '', link: '' },
	button: { label: '', url: '' },
	footer: { imprint: '', terms: '' },
};

/** A picture uploaded to this server is referenced as `viewer-image/<name>` (relative to the app). */
export const UPLOADED_IMAGE = /^viewer-image\/([a-z0-9]{8,32}\.(png|jpg|webp|gif))$/;
export const isUploadedImage = (value: string) => UPLOADED_IMAGE.test(value);
export const isHttpUrl = (value: string) => /^https?:\/\//i.test(value);

/** The uploaded pictures a template uses. */
export function uploadedImages(template: Template): string[] {
	return [...template.main, ...template.side].map((b) => String(b.props.url ?? '')).filter(isUploadedImage);
}

const MAX_BLOCKS = 24;
const MAX_TEXT = 4000;

const newId = () => Math.random().toString(36).slice(2, 10);

function sanitizeBlock(value: unknown, seen: Set<string>): Block | null {
	const block = value as Partial<Block> | null;
	if (!block || typeof block !== 'object' || !blockTypes.includes(block.type as BlockType)) {
		return null;
	}

	const type = block.type as BlockType;
	const defaults = blockDefaults[type];
	const props: Record<string, string | boolean> = {};

	// Only known settings are kept, each in the type of its default.
	for (const [key, fallback] of Object.entries(defaults)) {
		const given = (block.props as Record<string, unknown> | undefined)?.[key];
		if (typeof fallback === 'boolean') {
			props[key] = typeof given === 'boolean' ? given : fallback;
		} else {
			props[key] = typeof given === 'string' ? given.slice(0, MAX_TEXT) : fallback;
		}
	}

	// Links leave the page: only http(s) addresses and pictures uploaded to this server are kept.
	for (const key of ['url', 'link']) {
		const url = props[key];
		if (typeof url === 'string' && url !== '' && !isHttpUrl(url) && !(type === 'image' && key === 'url' && isUploadedImage(url))) {
			props[key] = '';
		}
	}

	let id = typeof block.id === 'string' && /^[a-z0-9]{1,16}$/i.test(block.id) ? block.id : newId();
	while (seen.has(id)) id = newId();
	seen.add(id);

	return { id, type, props };
}

/** A template as it may be stored: known block types and settings only, unique ids, bounded size. */
export function sanitizeTemplate(value: unknown): Template {
	const input = (value ?? {}) as Partial<Record<keyof Template, unknown>>;
	const seen = new Set<string>();
	const region = (blocks: unknown) =>
		(Array.isArray(blocks) ? blocks : [])
			.map((b) => sanitizeBlock(b, seen))
			.filter((b): b is Block => b !== null)
			.slice(0, MAX_BLOCKS);

	const template = { main: region(input.main), side: region(input.side) };

	// A page without a player or without the channel list cannot be used: fall back to the default.
	const types = [...template.main, ...template.side].map((b) => b.type);
	if (!types.includes('player') || !types.includes('channels')) {
		return defaultTemplate();
	}

	return template;
}

export function sanitizePresets(value: unknown): Preset[] {
	const seen = new Set<string>();

	return (Array.isArray(value) ? value : [])
		.map((entry): Preset | null => {
			const name = String(entry?.name ?? '')
				.trim()
				.slice(0, 60);
			if (name === '') return null;

			let id = typeof entry?.id === 'string' && /^[a-z0-9]{1,16}$/i.test(entry.id) ? entry.id : newId();
			while (seen.has(id)) id = newId();
			seen.add(id);

			return { id, name, template: sanitizeTemplate(entry?.template) };
		})
		.filter((p): p is Preset => p !== null)
		.slice(0, 30);
}

const block = (type: BlockType, props: Record<string, string | boolean> = {}): Block => ({ id: newId(), type, props: { ...blockDefaults[type], ...props } });

/** Player on the left, channel list beside it. */
export function defaultTemplate(): Template {
	return { main: [block('header'), block('player')], side: [block('channels')] };
}

/** Layouts offered next to the user's own presets. Ids are stable so the editor can tell them apart. */
export function builtinPresets(): Preset[] {
	return [
		{ id: 'builtin-side', name: 'Player with channel list', template: defaultTemplate() },
		{ id: 'builtin-stack', name: 'Single column', template: { main: [block('header'), block('player'), block('channels'), block('footer')], side: [] } },
		{
			id: 'builtin-event',
			name: 'Event page',
			template: {
				main: [block('header'), block('player'), block('text', { heading: 'About' })],
				side: [block('channels'), block('button'), block('footer')],
			},
		},
	];
}
