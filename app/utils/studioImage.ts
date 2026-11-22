import { MAX_IMAGE_CHARS } from '#shared/studio/setup';

/**
 * A picture file as a data: URL small enough to keep with the Studio's setup: scaled down to fit
 * `maxWidth`×`maxHeight`, and further if it is still too heavy. PNG keeps transparency (logos),
 * JPEG is for photographs (backgrounds). Null if the file is not a picture the browser can read.
 */
export async function pictureAsData(file: File, maxWidth: number, maxHeight: number, type: 'image/png' | 'image/jpeg'): Promise<string | null> {
	let bitmap: ImageBitmap;
	try {
		bitmap = await createImageBitmap(file);
	} catch {
		return null;
	}

	try {
		let scale = Math.min(1, maxWidth / bitmap.width, maxHeight / bitmap.height);
		for (let attempt = 0; attempt < 5; attempt++) {
			const canvas = document.createElement('canvas');
			canvas.width = Math.max(1, Math.round(bitmap.width * scale));
			canvas.height = Math.max(1, Math.round(bitmap.height * scale));
			canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

			const data = canvas.toDataURL(type, 0.85);
			if (data.length <= MAX_IMAGE_CHARS) return data;
			scale *= 0.7;
		}
		return null;
	} finally {
		bitmap.close();
	}
}
