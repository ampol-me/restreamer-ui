// Channels are addressed in viewer links by the first block of their id (/watch/a4ff4073).

export const SHORT_LENGTH = 8;

export const shortId = (channelid: string) => channelid.slice(0, SHORT_LENGTH);

/**
 * The channel a link refers to: by full id, or by a beginning of at least eight characters that
 * only one channel has. Two channels sharing the beginning make the short form ambiguous; such a
 * link opens nothing rather than the wrong channel.
 */
export function resolveChannel<T extends { channelid: string }>(channels: T[], reference: unknown): T | null {
	if (typeof reference !== 'string' || !/^[A-Za-z0-9-]{8,64}$/.test(reference)) return null;

	const exact = channels.find((c) => c.channelid === reference);
	if (exact) return exact;

	const matches = channels.filter((c) => c.channelid.startsWith(reference));
	return matches.length === 1 ? matches[0]! : null;
}
