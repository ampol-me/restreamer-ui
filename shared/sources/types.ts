// Types shared by the channel input sources (ported from legacy/src/views/Edit/Sources).

/* eslint-disable @typescript-eslint/no-explicit-any */

/** One ffmpeg input as the sources create it. Option values are passed on as the settings hold them (strings or numbers). */
export interface SourceInput {
	address: string;
	options: (string | number)[];
}

/** A device or stream the core found for a source (`skills.sources[id]`). */
export interface SourceDevice {
	id: string;
	name: string;
	media: string;
	extra?: string;
}

export type SourceCapability = 'audio' | 'video';

export type SourceSettings = Record<string, any>;

export interface SourceFunc<S extends SourceSettings = SourceSettings> {
	initSettings: (initialSettings?: any, config?: any) => S;
	createInputs: (settings: any, config?: any, skills?: any) => SourceInput[];
	[key: string]: any;
}

export interface Source<S extends SourceSettings = SourceSettings> {
	id: string;
	/** English name; translate with t(name). */
	name: string;
	capabilities: SourceCapability[];
	/** semver range of the ffmpeg versions the source works with. */
	ffversion: string;
	/** Icon name (i-lucide-* / i-simple-icons-*). */
	icon: string;
	func: SourceFunc<S>;
}
