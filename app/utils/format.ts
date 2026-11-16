/** Seconds as the process uptime shown by the legacy UI: HH:MM:SS (hours grow past 24). */
export function formatUptime(totalSeconds: number): string {
	const seconds = Math.max(0, Math.floor(totalSeconds || 0));
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${pad(Math.floor(seconds / 3600))}:${pad(Math.floor((seconds % 3600) / 60))}:${pad(seconds % 60)}`;
}

/** Bytes with a binary unit, one decimal from KiB up. */
export function formatBytes(bytes: number): string {
	const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
	let value = Math.max(0, bytes || 0);
	let unit = 0;
	while (value >= 1024 && unit < units.length - 1) {
		value /= 1024;
		unit++;
	}
	return `${unit === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unit]}`;
}

/** kbit/s as a short string; switches to Mbit/s from 10 000 kbit/s. */
export function formatBitrate(kbit: number): string {
	const value = Math.max(0, kbit || 0);
	return value >= 10000 ? `${(value / 1000).toFixed(1)} Mbit/s` : `${value.toFixed(0)} kbit/s`;
}

/** One line of a core process log: entries are [timestamp, text] pairs (or plain strings in the prelude). */
export function formatLogLine(entry: unknown): string {
	if (Array.isArray(entry)) {
		const [time, text] = entry as [unknown, unknown];
		const stamp = typeof time === 'number' || /^\d+$/.test(String(time)) ? new Date(Number(time) * 1000).toISOString() : String(time ?? '');
		return `${stamp} ${String(text ?? '')}`.trim();
	}
	return String(entry ?? '');
}
