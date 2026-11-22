import type { ProcessStateName } from '#shared/core/types';

export type TallyState = 'live' | 'preview' | 'ready' | 'off' | 'error';

/** How a process state is shown as a tally badge: its look and its (English, upper-case) word. */
export function tallyFor(state: ProcessStateName | string): { state: TallyState; label: string } {
	switch (state) {
		case 'connected':
			return { state: 'live', label: 'LIVE' };
		case 'connecting':
			return { state: 'ready', label: 'CONNECTING' };
		case 'disconnecting':
			return { state: 'off', label: 'STOPPING' };
		case 'error':
			return { state: 'error', label: 'ERROR' };
		default:
			return { state: 'off', label: 'OFF' };
	}
}
