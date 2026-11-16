// File checks of the legacy upload button (legacy/src/misc/UploadButton.js) and the messages the
// player and playersite views showed for its errors.

export interface UploadType {
	mimetype: string;
	extension: string;
	maxSize: number;
}

export type UploadError =
	| { type: 'nofiles' }
	| { type: 'mimetype'; actual: string; allowed: string[] }
	| { type: 'size'; actual: number; allowed: number }
	| { type: 'read'; message: string };

export type UploadCheck = { ok: true; type: UploadType } | { ok: false; error: UploadError };

const MiB = 1024 * 1024;

export const logoImageTypes: UploadType[] = [
	{ mimetype: 'image/gif', extension: 'gif', maxSize: 1 * MiB },
	{ mimetype: 'image/png', extension: 'png', maxSize: 1 * MiB },
	{ mimetype: 'image/jpeg', extension: 'jpg', maxSize: 1 * MiB },
	{ mimetype: 'image/svg+xml', extension: 'svg', maxSize: 1 * MiB },
];

export const posterImageTypes: UploadType[] = [
	{ mimetype: 'image/gif', extension: 'gif', maxSize: 1 * MiB },
	{ mimetype: 'image/png', extension: 'png', maxSize: 1 * MiB },
	{ mimetype: 'image/jpeg', extension: 'jpg', maxSize: 1 * MiB },
];

export const playersiteImageTypes: UploadType[] = logoImageTypes;

export const playersiteTemplateTypes: UploadType[] = [{ mimetype: 'text/html', extension: 'html', maxSize: 500 * 1024 }];

/** The first accepted type the file matches ("image/*" style wildcards allowed), then its size limit. */
export function checkUpload(file: { type: string; size: number } | null | undefined, acceptTypes: UploadType[]): UploadCheck {
	if (!file) {
		return { ok: false, error: { type: 'nofiles' } };
	}

	const actual = file.type.split('/');
	const type = acceptTypes.find((t) => {
		const accept = t.mimetype.split('/');
		return accept[0] === actual[0] && (accept[1] === '*' || accept[1] === actual[1]);
	});

	if (!type) {
		return { ok: false, error: { type: 'mimetype', actual: file.type, allowed: acceptTypes.map((t) => t.mimetype) } };
	}

	if (file.size > type.maxSize) {
		return { ok: false, error: { type: 'size', actual: file.size, allowed: type.maxSize } };
	}

	return { ok: true, type };
}

/** Port of legacy/src/misc/Filesize.js. */
export function filesize(bytes: number, si = false, digits = 1): string {
	const thresh = si ? 1000 : 1024;

	if (Math.abs(bytes) < thresh) {
		return bytes + ' B';
	}

	const units = si ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'] : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
	let u = -1;
	const r = 10 ** digits;

	do {
		bytes /= thresh;
		++u;
	} while (Math.round(Math.abs(bytes) * r) / r >= thresh && u < units.length - 1);

	return bytes.toFixed(digits) + ' ' + units[u];
}

/** Translates a message keyed by its English text; `values` fill the positional {0}, {1} … placeholders. */
export type ListTranslator = (message: string, values?: string[]) => string;

const plain: ListTranslator = (message, values = []) => message.replace(/\{(\d+)\}/g, (m, i) => values[Number(i)] ?? m);

/** The legacy wording for an upload error. The catalog keys are the ones lingui extracted. */
export function uploadErrorMessage(error: UploadError | { type: string }, translate: ListTranslator = plain): string {
	const err = error as UploadError;

	switch (err.type) {
		case 'nofiles':
			return translate('Please select a file to upload.');
		case 'mimetype':
			return translate('The selected file type ({0}) is not allowed. Allowed file types are {1}', [err.actual, err.allowed.join(', ')]);
		case 'size':
			// The sizes were components in the legacy message, hence the <0/> markers in the key.
			return translate('The selected file is too big (<0/>). Only <1/> are allowed.')
				.replace('<0/>', filesize(err.actual))
				.replace('<1/>', filesize(err.allowed));
		case 'read':
			return translate('There was an error during upload: {0}', [err.message]);
		default:
			return translate('Unknown upload error');
	}
}
