// 1:1 port of legacy/src/utils/anonymizer.js
import urlparser from 'url-parse';

const anonymize_url = (url: string): string => {
	const u = urlparser(url, true);

	if (u.hostname !== 'localhost') {
		return `${u.protocol}//[anonymized]`;
	}

	if (u.auth.length !== 0) {
		// url-parse types these as readonly, but toString() reads them back.
		const auth = u as unknown as { username: string; password: string };
		auth.username = '***';
		auth.password = '***';
	}

	if (u.protocol === 'rtmp:') {
		if ('token' in u.query) {
			u.query.token = '***';
		}
		// Legacy compares against 'srt' without the colon (url-parse yields 'srt:'), so this branch never runs; kept as is.
	} else if (u.protocol === 'srt') {
		if ('streamid' in u.query) {
			u.query.streamid = '***';
		}

		if ('passphrase' in u.query) {
			u.query.passphrase = '***';
		}
	}

	return u.toString();
};

const anonymize = (text: string): string => {
	const regex = /(?:([a-z0-9\\]+):)?\/[A-Za-z0-9-._~!$&'()*+,;=:@?/{}%\\]*/gm;

	return text.replaceAll(regex, (match: string, scheme?: string) => {
		if (scheme) {
			match = match.replace(scheme, scheme.replaceAll('\\', ''));
			return anonymize_url(match);
		}

		const pathElm = match.split('/').filter((p) => p.length !== 0);
		if (pathElm.length < 2) {
			return match;
		}

		return `/[anonymized]/${pathElm.pop()}`;
	});
};

export { anonymize, anonymize_url };
