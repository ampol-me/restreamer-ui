import { expect, test } from 'bun:test';
import { tallyFor } from './tally';

test('every process state has a tally look and a word', () => {
	expect(tallyFor('connected')).toEqual({ state: 'live', label: 'LIVE' });
	expect(tallyFor('connecting')).toEqual({ state: 'ready', label: 'CONNECTING' });
	expect(tallyFor('disconnecting')).toEqual({ state: 'off', label: 'STOPPING' });
	expect(tallyFor('error')).toEqual({ state: 'error', label: 'ERROR' });
	expect(tallyFor('disconnected')).toEqual({ state: 'off', label: 'OFF' });
	expect(tallyFor('something-new')).toEqual({ state: 'off', label: 'OFF' });
});
