// Shapes shared by the coder modules. The legacy-ported modules are still untyped;
// modules written for the Nuxt UI implement these directly.

export interface CoderMapping {
	// Options placed before the inputs; each entry is one option with its values.
	global: string[][];
	// Options of the output stream this coder is used for.
	local: string[];
	// Filters the coder itself needs (e.g. hwupload), appended to the user's filter graph.
	filter: string[];
}

export interface CoderStream {
	codec?: string;
	[key: string]: unknown;
}

export interface CoderSkills {
	ffmpeg?: { version?: string; version_major?: number; version_minor?: number };
	[key: string]: unknown;
}

export interface VideoEncoder<S> {
	coder: string;
	name: string;
	codec: string;
	type: 'video';
	hwaccel: boolean;
	init(initial?: Partial<S>): S;
	createMapping(settings: S, stream?: CoderStream, skills?: CoderSkills): CoderMapping;
	summarize(settings: S): string;
	defaults(stream?: CoderStream, skills?: CoderSkills): { settings: S; mapping: CoderMapping };
}

/** `-g` value: GOP length in seconds times the frame rate. */
export function gopFrames(fps: string, gopSeconds: string): string {
	return Math.round(parseInt(fps) * parseInt(gopSeconds)).toFixed(0);
}
