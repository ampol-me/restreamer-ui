// The stored settings of the viewer site and how an admin update changes them.
import { noLimits, sanitizeLimits, type ChannelAccess, type ChannelLimits, type ChannelRule } from './access';
import { hashPasscode, isValidPasscode, type PasscodeHash } from './passcode';
import { isChannelId, type StreamStorage } from './paths';
import {
	defaultTemplate,
	isHttpUrl,
	isUploadedImage,
	sanitizePresets,
	sanitizeTemplate,
	uploadedImages,
	type Preset,
	type Template,
} from '../../../shared/viewer/template';

export interface ViewerChannel extends ChannelRule {
	name: string;
	description: string;
	storage: StreamStorage;
}

export interface ViewerConfig {
	enabled: boolean;
	title: string;
	// Optional picture behind the page (http(s) address).
	background: string;
	channels: ViewerChannel[];
	template: Template;
	presets: Preset[];
}

/** What the admin sends for one channel. `passcode` is only present when it is being (re)set. */
export interface ChannelUpdate {
	channelid?: unknown;
	name?: unknown;
	description?: unknown;
	storage?: unknown;
	access?: unknown;
	passcode?: unknown;
	limits?: unknown;
	resetUses?: unknown;
}

export interface ConfigUpdate {
	enabled?: unknown;
	title?: unknown;
	background?: unknown;
	channels?: unknown;
	template?: unknown;
	presets?: unknown;
}

/** What the admin gets back: everything but the passcode hashes. */
export interface AdminChannelView {
	channelid: string;
	name: string;
	description: string;
	storage: StreamStorage;
	access: ChannelAccess;
	hasPasscode: boolean;
	limits: ChannelLimits;
	uses: number;
}

export const emptyConfig = (): ViewerConfig => ({ enabled: false, title: '', background: '', channels: [], template: defaultTemplate(), presets: [] });

const pictureUrl = (value: unknown) => (typeof value === 'string' && (isHttpUrl(value) || isUploadedImage(value)) ? value.slice(0, 2000) : '');

/** Every uploaded picture the settings still refer to (page, current layout, presets). */
export function referencedImages(config: ViewerConfig): Set<string> {
	return new Set(
		[config.background, ...uploadedImages(config.template), ...config.presets.flatMap((p) => uploadedImages(p.template))].filter(isUploadedImage),
	);
}

const access = (value: unknown): ChannelAccess => (value === 'public' || value === 'passcode' ? value : 'hidden');

export class ConfigError extends Error {}

/**
 * Applies an admin update. Channels are replaced by the submitted list; a channel keeps its
 * passcode, use counter and code revision unless a new passcode is sent for it. Returns the
 * new config and the channels whose passcode changed (their viewers have to be signed out).
 */
export function applyUpdate(current: ViewerConfig, update: ConfigUpdate): { config: ViewerConfig; changedCodes: string[] } {
	const previous = new Map(current.channels.map((c) => [c.channelid, c]));
	const changedCodes: string[] = [];
	const channels: ViewerChannel[] = [];
	const seen = new Set<string>();

	for (const entry of (Array.isArray(update.channels) ? update.channels : []) as ChannelUpdate[]) {
		const channelid = entry?.channelid;
		if (!isChannelId(channelid) || seen.has(channelid)) continue;
		seen.add(channelid);

		const old = previous.get(channelid);
		let passcode: PasscodeHash | null = old?.passcode ?? null;
		let codeRevision = old?.codeRevision ?? 0;
		let uses = old?.uses ?? 0;

		if (entry.passcode !== undefined && entry.passcode !== null && entry.passcode !== '') {
			if (!isValidPasscode(entry.passcode)) {
				throw new ConfigError('The passcode must be exactly 6 digits.');
			}
			passcode = hashPasscode(entry.passcode);
			codeRevision += 1;
			uses = 0;
			changedCodes.push(channelid);
		} else if (entry.resetUses === true) {
			uses = 0;
		}

		const channel: ViewerChannel = {
			channelid,
			name: String(entry.name ?? '').slice(0, 200),
			description: String(entry.description ?? '').slice(0, 2000),
			storage: entry.storage === 'diskfs' ? 'diskfs' : 'memfs',
			access: access(entry.access),
			passcode,
			codeRevision,
			limits: sanitizeLimits(entry.limits),
			uses,
		};

		if (channel.access === 'passcode' && channel.passcode === null) {
			throw new ConfigError('Set a passcode for every channel that requires one.');
		}

		channels.push(channel);
	}

	return {
		config: {
			enabled: update.enabled === true,
			title: String(update.title ?? '').slice(0, 200),
			background: pictureUrl(update.background),
			channels,
			template: update.template === undefined ? current.template : sanitizeTemplate(update.template),
			presets: update.presets === undefined ? current.presets : sanitizePresets(update.presets),
		},
		changedCodes,
	};
}

/**
 * Changes one channel (from the channel's own page) and leaves the rest as it is: the other
 * channels, the page design, and of this channel whatever the update does not mention (its
 * limits, and its passcode unless a new one is sent). `enable` also switches the site on.
 */
export function applyChannelUpdate(current: ViewerConfig, entry: ChannelUpdate, enable = false): { config: ViewerConfig; changedCodes: string[] } {
	const keep = (c: ViewerChannel): ChannelUpdate => ({
		channelid: c.channelid,
		name: c.name,
		description: c.description,
		storage: c.storage,
		access: c.access,
		limits: c.limits,
	});

	const old = current.channels.find((c) => c.channelid === entry.channelid);
	const merged: ChannelUpdate = { ...(old ? keep(old) : {}), ...entry };
	const channels = old ? current.channels.map((c) => (c === old ? merged : keep(c))) : [...current.channels.map(keep), merged];

	return applyUpdate(current, { enabled: current.enabled || enable, title: current.title, background: current.background, channels });
}

export function adminView(config: ViewerConfig): Omit<ViewerConfig, 'channels'> & { channels: AdminChannelView[] } {
	return {
		...config,
		channels: config.channels.map((c) => ({
			channelid: c.channelid,
			name: c.name,
			description: c.description,
			storage: c.storage,
			access: c.access,
			hasPasscode: c.passcode !== null,
			limits: c.limits,
			uses: c.uses,
		})),
	};
}

/** Reads whatever is stored (possibly from an older version) into a complete config. */
export function normalizeConfig(stored: unknown): ViewerConfig {
	const input = (stored ?? {}) as Partial<ViewerConfig>;

	const channels = (Array.isArray(input.channels) ? input.channels : [])
		.filter((c) => isChannelId(c?.channelid))
		.map((c): ViewerChannel => ({
			channelid: c.channelid,
			name: String(c.name ?? ''),
			description: String(c.description ?? ''),
			storage: c.storage === 'diskfs' ? 'diskfs' : 'memfs',
			access: access(c.access),
			passcode: c.passcode && typeof c.passcode.hash === 'string' && typeof c.passcode.salt === 'string' ? c.passcode : null,
			codeRevision: Number.isFinite(c.codeRevision) ? c.codeRevision : 0,
			limits: sanitizeLimits(c.limits),
			uses: Number.isFinite(c.uses) && c.uses > 0 ? Math.floor(c.uses) : 0,
		}));

	return {
		enabled: input.enabled === true,
		title: String(input.title ?? ''),
		background: pictureUrl(input.background),
		channels,
		template: sanitizeTemplate(input.template),
		presets: sanitizePresets(input.presets),
	};
}

/** The single-passcode "View Portal" settings this replaces. */
export interface LegacyPortalConfig {
	enabled?: boolean;
	title?: string;
	channels?: { channelid: string; name?: string; storage?: string }[];
	passcode?: PasscodeHash | null;
	revision?: number;
}

/** Carries a View Portal over: every portal channel keeps the portal's passcode. */
export function migratePortal(portal: LegacyPortalConfig): ViewerConfig {
	const passcode = portal.passcode ?? null;

	return normalizeConfig({
		enabled: portal.enabled === true && passcode !== null,
		title: portal.title ?? '',
		channels: (portal.channels ?? []).map((c) => ({
			channelid: c.channelid,
			name: c.name ?? '',
			storage: c.storage,
			access: passcode ? 'passcode' : 'hidden',
			passcode,
			codeRevision: portal.revision ?? 0,
			limits: noLimits(),
			uses: 0,
		})),
	});
}
