import { expect, test } from 'bun:test';
import { formatBitrate, formatBytes, formatLogLine, formatUptime } from './format';

test('formatUptime', () => {
	expect(formatUptime(0)).toBe('00:00:00');
	expect(formatUptime(59.9)).toBe('00:00:59');
	expect(formatUptime(3661)).toBe('01:01:01');
	expect(formatUptime(100 * 3600 + 5)).toBe('100:00:05');
	expect(formatUptime(-3)).toBe('00:00:00');
	expect(formatUptime(Number.NaN)).toBe('00:00:00');
});

test('formatBytes', () => {
	expect(formatBytes(0)).toBe('0 B');
	expect(formatBytes(1023)).toBe('1023 B');
	expect(formatBytes(1024)).toBe('1.0 KiB');
	expect(formatBytes(1536 * 1024)).toBe('1.5 MiB');
	expect(formatBytes(3 * 1024 ** 4)).toBe('3.0 TiB');
	expect(formatBytes(5 * 1024 ** 5)).toBe('5120.0 TiB');
});

test('formatBitrate', () => {
	expect(formatBitrate(0)).toBe('0 kbit/s');
	expect(formatBitrate(4096.4)).toBe('4096 kbit/s');
	expect(formatBitrate(12500)).toBe('12.5 Mbit/s');
});

test('formatLogLine', () => {
	expect(formatLogLine(['1763280000', '[info] hello'])).toBe('2025-11-16T08:00:00.000Z [info] hello');
	expect(formatLogLine([1763280000, 'x'])).toBe('2025-11-16T08:00:00.000Z x');
	expect(formatLogLine(['2026-11-16T09:10:20Z', 'x'])).toBe('2026-11-16T09:10:20Z x');
	expect(formatLogLine('plain banner line')).toBe('plain banner line');
	expect(formatLogLine(null)).toBe('');
});
