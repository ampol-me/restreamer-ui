// Shapes and view logic of the player and playersite settings. The defaults themselves live in
// the core client (InitPlayerSettings / InitPlayersiteSettings in shared/core/restreamer.ts).

export type LogoPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface PlayerSettings {
	autoplay: boolean;
	mute: boolean;
	statistics: boolean;
	chromecast: boolean;
	airplay: boolean;
	color: { seekbar: string; buttons: string };
	ga: { account: string; name: string };
	logo: { image: string; position: LogoPosition; link: string };
	poster: string;
	[key: string]: unknown;
}

export interface PlayersiteSettings {
	player: string;
	playersite: boolean;
	channelid: string;
	channel_list: string[];
	title: string;
	share: boolean;
	support: boolean;
	chromecast: boolean;
	airplay: boolean;
	template: string;
	templatename: string;
	textcolor_title: string;
	textcolor_default: string;
	textcolor_link: string;
	textcolor_link_hover: string;
	bgcolor_default: string;
	bgcolor_selected: string;
	bgcolor_unselected: string;
	bgcolor_header: string;
	hrcolor: string;
	bgimage_url: string;
	inject1: string;
	inject2: string;
	inject3: string;
	inject4: string;
	imprint: string;
	terms: string;
	[key: string]: unknown;
}

export const logoPositions: { value: LogoPosition; label: string }[] = [
	{ value: 'top-left', label: 'Top-Left' },
	{ value: 'top-right', label: 'Top-Right' },
	{ value: 'bottom-left', label: 'Bottom-Left' },
	{ value: 'bottom-right', label: 'Bottom-Right' },
];

/** The logo fields as "Reset logo" leaves them. */
export function resetLogo(settings: PlayerSettings): PlayerSettings {
	return { ...settings, logo: { ...settings.logo, image: '', position: 'top-left', link: '' } };
}

/**
 * Address the preview loads an image from: paths on the core get the core address in front, and
 * a cache buster is added so that a re-uploaded file with the same name shows up.
 */
export function prepareUrl(url: string, address: string, random: () => number = Math.random): string {
	if (url.length === 0) {
		return '';
	}

	if (url.match(/^https?:\/\//) === null) {
		url = address + url;
	}

	try {
		const u = new URL(url);
		u.searchParams.set('_rscache', String(random()));
		return u.href;
	} catch {
		return url + '?' + random();
	}
}

interface NamedChannel {
	channelid: string;
	name: string;
}

/** Channels by name, ignoring case; does not reorder the list it is given. */
export function sortChannels<T extends NamedChannel>(channels: readonly T[]): T[] {
	return [...channels].sort((a, b) => {
		const aname = a.name.toUpperCase();
		const bname = b.name.toUpperCase();
		return aname < bname ? -1 : aname > bname ? 1 : 0;
	});
}

/** The channel index.html shows: the configured one if it still exists, else the selected channel. */
export function mainChannelId(configured: string, channels: readonly NamedChannel[], currentChannelId: string): string {
	return channels.some((c) => c.channelid === configured) ? configured : currentChannelId;
}

/** The channels that can be picked as additional ones: all but the main channel, sorted by name. */
export function additionalChannelOptions<T extends NamedChannel>(channels: readonly T[], mainId: string): T[] {
	return sortChannels(channels).filter((c) => c.channelid !== mainId);
}

/** The picked additional channels: the stored list without the main channel. */
export function additionalChannels(channelList: readonly string[], mainId: string): string[] {
	return channelList.filter((id) => id !== mainId);
}

/** Template names for the selection, sorted like the legacy list (code unit order). */
export function sortTemplates(templates: readonly string[]): string[] {
	return [...templates].sort();
}
