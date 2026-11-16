import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export interface PasscodeHash {
	salt: string;
	hash: string;
}

/** A portal passcode is exactly six digits. */
export function isValidPasscode(value: unknown): value is string {
	return typeof value === 'string' && /^\d{6}$/.test(value);
}

// Six digits are only a million combinations: the hash stops the stored file from revealing
// the passcode at a glance, the attempt limiter (limiter.ts) is what stops guessing.
export function hashPasscode(passcode: string, salt = randomBytes(16).toString('hex')): PasscodeHash {
	return { salt, hash: scryptSync(passcode, salt, 32).toString('hex') };
}

export function verifyPasscode(passcode: unknown, stored: PasscodeHash | null | undefined): boolean {
	if (!stored || !isValidPasscode(passcode)) {
		return false;
	}

	const expected = Buffer.from(stored.hash, 'hex');
	const actual = scryptSync(passcode, stored.salt, 32);

	return expected.length === actual.length && timingSafeEqual(expected, actual);
}
