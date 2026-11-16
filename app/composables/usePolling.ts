/**
 * Runs `fn` now and then every `intervalMs` while the component is mounted. A run that is still
 * in flight is not overlapped: the next tick is skipped instead (the core answers in well under
 * a second, but a slow link should not pile requests up).
 */
export function usePolling(fn: () => Promise<void>, intervalMs = 1000) {
	let timer: ReturnType<typeof setInterval> | null = null;
	let running = false;

	const tick = async () => {
		if (running) return;
		running = true;
		try {
			await fn();
		} finally {
			running = false;
		}
	};

	onMounted(() => {
		void tick();
		timer = setInterval(tick, intervalMs);
	});

	onBeforeUnmount(() => {
		if (timer) clearInterval(timer);
	});

	return { refresh: tick };
}
