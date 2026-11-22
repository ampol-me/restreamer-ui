// Content licenses a channel can carry (legacy misc/controls/License).

export const licenses = ['none', 'CC0 1.0', 'CC BY 4.0', 'CC BY-SA 4.0', 'CC BY-NC 4.0', 'CC BY-NC-SA 4.0', 'CC BY-ND 4.0', 'CC BY-NC-ND 4.0'] as const;

export interface LicenseInfo {
	// File below /licenses/ with the Creative Commons badge.
	image: string;
	link: string;
	// English description; the UI translates it.
	description: string;
}

const kinds: Record<string, { image: string; path: string; description: string }> = {
	CC0: {
		image: 'cc-zero.svg',
		path: 'zero',
		description:
			'The person who associated a work with this deed has dedicated the work to the public domain by waiving all of his or her rights to the work worldwide under copyright law, including all related and neighboring rights, to the extent allowed by law. You can copy, modify, distribute and perform the work, even for commercial purposes, all without asking permission.',
	},
	'CC BY': {
		image: 'by.svg',
		path: 'by',
		description:
			'This license allows reusers to distribute, remix, adapt, and build upon the material in any medium or format, so long as attribution is given to the creator. The license allows for commercial use.',
	},
	'CC BY-SA': {
		image: 'by-sa.svg',
		path: 'by-sa',
		description:
			'This license allows reusers to distribute, remix, adapt, and build upon the material in any medium or format, so long as attribution is given to the creator. The license allows for commercial use. If you remix, adapt, or build upon the material, you must license the modified material under identical terms.',
	},
	'CC BY-NC': {
		image: 'by-nc.svg',
		path: 'by-nc',
		description:
			'This license allows reusers to distribute, remix, adapt, and build upon the material in any medium or format for noncommercial purposes only, and only so long as attribution is given to the creator.',
	},
	'CC BY-NC-SA': {
		image: 'by-nc-sa.svg',
		path: 'by-nc-sa',
		description:
			'This license allows reusers to distribute, remix, adapt, and build upon the material in any medium or format for noncommercial purposes only, and only so long as attribution is given to the creator. If you remix, adapt, or build upon the material, you must license the modified material under identical terms.',
	},
	'CC BY-ND': {
		image: 'by-nd.svg',
		path: 'by-nd',
		description:
			'This license allows reusers to copy and distribute the material in any medium or format in unadapted form only, and only so long as attribution is given to the creator. The license allows for commercial use.',
	},
	'CC BY-NC-ND': {
		image: 'by-nc-nd.svg',
		path: 'by-nc-nd',
		description:
			'This license allows reusers to copy and distribute the material in any medium or format in unadapted form only, for noncommercial purposes only, and only so long as attribution is given to the creator.',
	},
};

/** Badge, deed link and description of a license such as "CC BY-SA 4.0"; null for "none"/unknown. */
export function licenseInfo(license: string): LicenseInfo | null {
	const version = license.match(/[0-9]+\.[0-9]+$/)?.[0] ?? '4.0';
	const kind = kinds[license.replace(/[0-9]+\.[0-9]+$/, '').trim()];
	if (!kind) {
		return null;
	}

	// CC0 only exists as 1.0.
	const link = kind.path === 'zero' ? 'https://creativecommons.org/licenses/zero/1.0/' : `https://creativecommons.org/licenses/${kind.path}/${version}/`;

	return { image: kind.image, link, description: kind.description };
}
