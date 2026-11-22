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

// Typed views of the (still untyped) ported modules and registries, for the settings forms.

type Settings = Record<string, any>;

interface CoderModuleBase {
	coder: string;
	name: string;
	type: 'video' | 'audio';
	hwaccel: boolean;
	// Fills missing settings with the coder's defaults. Coders without settings have none.
	init?(initial?: Settings): Settings;
	createMapping(settings: Settings, stream?: unknown, skills?: unknown): CoderMapping;
	defaults(stream?: unknown, skills?: unknown): { settings: Settings; mapping: CoderMapping };
}

export interface EncoderModule extends CoderModuleBase {
	codec: string;
	summarize(settings: Settings): string;
}

export interface DecoderModule extends CoderModuleBase {
	// Codecs the decoder handles; empty means any.
	codecs: string[];
}

export interface CoderRegistry<T extends CoderModuleBase> {
	Get(coder: string): T | null;
	GetCoderForCodec(codec: string, availableCoders: string[]): T | null;
	GetCodersForCodec(codec: string, availableCoders: string[], hwAcceleration: 'any' | 'no' | 'yes'): T[];
	Coders(): string[];
	List(): T[];
}

export interface FilterModule {
	filter: string;
	name: string;
	type: 'video' | 'audio';
	hwaccel: boolean;
	init(initial?: Settings): Settings;
	// Legacy's pan filter returns its graph as an array; consumers only join and measure it.
	createGraph(settings: Settings): string | string[];
	summarize(settings: Settings): string | undefined;
	defaults(): { settings: Settings; graph: string | string[] };
}

export interface FilterRegistry {
	Get(filter: string): FilterModule | null;
	Filters(): string[];
	List(): FilterModule[];
}
