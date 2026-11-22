import { describe, expect, test } from 'bun:test';

import { sendTarget } from './sendTo';

const config = {
	channelid: 'chan-1',
	rtmp: { enabled: true, secure: false, host: 'live.example.com:1935', app: '/live', token: 'se cret' },
	srt: { enabled: true, host: 'live.example.com:6000', token: 'tok', passphrase: 'phrase-0123' },
};
const push = (type: string, name = 'chan-1') => ({ type: 'network', settings: { mode: 'push', push: { type, name } } });

describe('where to send the stream', () => {
	test('RTMP: server and key together are the address', () => {
		const target = sendTarget(push('rtmp'), config)!;
		expect(target).toEqual({
			protocol: 'rtmp',
			address: 'rtmp://live.example.com:1935/live/chan-1.stream/se%20cret',
			server: 'rtmp://live.example.com:1935/live',
			key: 'chan-1.stream/se%20cret',
		});
		expect(`${target.server}/${target.key}`).toBe(target.address);
	});

	test('RTMPS without a token', () => {
		const target = sendTarget(push('rtmp'), { ...config, rtmp: { ...config.rtmp, secure: true, token: '' } })!;
		expect(target.server).toBe('rtmps://live.example.com:1935/live');
		expect(target.key).toBe('chan-1.stream');
	});

	test('SRT: one address in publish mode', () => {
		const target = sendTarget(push('srt'), config)!;
		expect(target.protocol).toBe('srt');
		expect(target.address).toContain('streamid=chan-1.stream,mode:publish,token:tok');
		expect(target.server).toBeUndefined();
	});

	test('nothing to hand out for other sources, other stream names or a switched-off server', () => {
		expect(sendTarget(undefined, config)).toBeNull();
		expect(sendTarget({ type: 'network', settings: { mode: 'pull' } }, config)).toBeNull();
		expect(sendTarget({ type: 'playlist', settings: {} }, config)).toBeNull();
		expect(sendTarget(push('rtmp', 'someone-elses.stream'), config)).toBeNull();
		expect(sendTarget(push('rtmp'), { ...config, rtmp: { ...config.rtmp, enabled: false } })).toBeNull();
		expect(sendTarget(push('hls'), config)).toBeNull();
	});
});
