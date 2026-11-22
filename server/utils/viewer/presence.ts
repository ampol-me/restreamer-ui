// Counts who is watching a protected channel right now, for the concurrent-viewer limit.
// A viewer is "present" while their player keeps fetching the stream; a few missed fetches
// (HLS players ask for the playlist every couple of seconds) free the seat.

export class Presence {
	private seats = new Map<string, Map<string, number>>();

	constructor(private ttlMs = 30_000) {}

	private active(channelid: string, now: number): Map<string, number> {
		let seats = this.seats.get(channelid);
		if (!seats) {
			seats = new Map();
			this.seats.set(channelid, seats);
		}
		for (const [session, seen] of seats) {
			if (seen + this.ttlMs <= now) seats.delete(session);
		}
		return seats;
	}

	count(channelid: string, now: number): number {
		return this.active(channelid, now).size;
	}

	/**
	 * A stream request from `session`. Returns false when the channel is full and the session
	 * does not hold a seat already. `max` 0 = no limit (the viewer is still counted).
	 */
	touch(channelid: string, session: string, now: number, max: number): boolean {
		const seats = this.active(channelid, now);
		if (!seats.has(session) && max > 0 && seats.size >= max) {
			return false;
		}
		seats.set(session, now);
		return true;
	}

	/** Gives a seat back (the viewer left, or their passcode changed). */
	leave(channelid: string, session: string): void {
		this.seats.get(channelid)?.delete(session);
	}

	/** Who holds a seat, for keeping the count over a restart of the server. */
	snapshot(now: number): Record<string, string[]> {
		const result: Record<string, string[]> = {};
		for (const channelid of this.seats.keys()) {
			const sessions = [...this.active(channelid, now).keys()];
			if (sessions.length > 0) result[channelid] = sessions;
		}
		return result;
	}

	/** Seats from a snapshot count as just seen: whoever really left drops out after the timeout. */
	restore(snapshot: unknown, now: number): void {
		if (!snapshot || typeof snapshot !== 'object') return;
		for (const [channelid, sessions] of Object.entries(snapshot)) {
			if (!Array.isArray(sessions)) continue;
			const seats = this.active(channelid, now);
			for (const session of sessions) {
				if (typeof session === 'string' && !seats.has(session)) seats.set(session, now);
			}
		}
	}

	/** Empties a channel, e.g. after its passcode changed. */
	clear(channelid: string): void {
		this.seats.delete(channelid);
	}
}
