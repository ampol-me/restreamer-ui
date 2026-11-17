import { expect, test } from 'bun:test';

import services from '../services';
import { isSecretField } from './secret';

test('keys, tokens and passwords are secret; addresses and names are not', () => {
	for (const key of [
		'stream_key',
		'key',
		'token',
		'rtmp.token',
		'password',
		'srt.passphrase',
		'stream_key_primary',
		'stream_key_backup',
		'rtmp_token',
		'options.hls_enc_key',
	]) {
		expect(isSecretField({ key, type: 'text' })).toBe(true);
	}
	for (const key of [
		'address',
		'name',
		'keyframe',
		'monkey',
		'url',
		'stream_name',
		'title',
		'options.hls_enc_key_url',
		'options.hls_key_info_file',
		'primary',
	]) {
		expect(isSecretField({ key, type: 'text' })).toBe(false);
	}
	expect(isSecretField({ key: 'anything', type: 'password' })).toBe(true);
	expect(isSecretField({ key: 'token', type: 'checkbox' })).toBe(false);
});

test('the stream keys of the big platforms are covered', () => {
	for (const id of ['youtube', 'facebook', 'twitch', 'instagram']) {
		const secret = services
			.Get(id)!
			.fields.filter((f) => isSecretField(f))
			.map((f) => f.key);
		expect(secret.length).toBeGreaterThan(0);
	}
});
