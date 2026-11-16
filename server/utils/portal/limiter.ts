// Limits passcode guessing. Two budgets, both over a sliding window:
//  - per client (IP): a handful of wrong attempts, then that client waits;
//  - global: a cap on wrong attempts from everyone together, so a guess spread over many
//    addresses is slowed down too. With 6 digits this is what keeps the search space meaningful.
export interface LimiterOptions {
	windowMs: number;
	maxPerClient: number;
	maxGlobal: number;
}

export const defaultLimiterOptions: LimiterOptions = {
	windowMs: 10 * 60 * 1000,
	maxPerClient: 5,
	maxGlobal: 100,
};

export class AttemptLimiter {
	private failures = new Map<string, number[]>();
	private all: number[] = [];

	constructor(private options: LimiterOptions = defaultLimiterOptions) {}

	private prune(now: number) {
		const cutoff = now - this.options.windowMs;
		this.all = this.all.filter((t) => t > cutoff);
		for (const [client, times] of this.failures) {
			const kept = times.filter((t) => t > cutoff);
			if (kept.length === 0) this.failures.delete(client);
			else this.failures.set(client, kept);
		}
	}

	/** Milliseconds the client has to wait before the next attempt; 0 = may try now. */
	retryAfter(client: string, now: number): number {
		this.prune(now);

		const mine = this.failures.get(client) ?? [];
		if (mine.length >= this.options.maxPerClient) {
			return mine[mine.length - this.options.maxPerClient]! + this.options.windowMs - now;
		}

		if (this.all.length >= this.options.maxGlobal) {
			return this.all[this.all.length - this.options.maxGlobal]! + this.options.windowMs - now;
		}

		return 0;
	}

	recordFailure(client: string, now: number) {
		this.prune(now);
		this.all.push(now);
		this.failures.set(client, [...(this.failures.get(client) ?? []), now]);
	}

	/** A correct passcode clears that client's failures (not the global count). */
	recordSuccess(client: string) {
		this.failures.delete(client);
	}
}
