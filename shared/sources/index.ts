// Ported from legacy/src/views/Edit/Sources/index.js and the source list of legacy/src/views/Edit/SourceSelect.js
import SemverSatisfies from 'semver/functions/satisfies';

import * as ALSA from './alsa';
import * as AudioLoop from './audioloop';
import * as AVFoundation from './avfoundation';
import * as Network from './network';
import * as NoAudio from './noaudio';
import * as Raspicam from './raspicam';
import * as Video4Linux from './v4l';
import * as VideoAudio from './videoaudio';
import * as VideoLoop from './videoloop';
import * as VirtualAudio from './virtualaudio';
import * as VirtualVideo from './virtualvideo';
import type { Source, SourceCapability, SourceDevice } from './types';

export type * from './types';

export class Registry {
	services: Map<string, Source>;

	constructor() {
		this.services = new Map();
	}

	Register(service: Source): void {
		this.services.set(service.id, service);
	}

	Get(id: string): Source | null {
		const service = this.services.get(id);
		if (service) {
			return service;
		}

		return null;
	}

	IDs(): string[] {
		return Array.from(this.services.keys());
	}

	List(): Source[] {
		return Array.from(this.services.values());
	}
}

const registry = new Registry();

// As in legacy, the framebuffer source (./framebuffer) is not registered.
registry.Register(Network);
registry.Register(ALSA);
registry.Register(AVFoundation);
registry.Register(Video4Linux);
registry.Register(Raspicam);
registry.Register(VirtualAudio);
registry.Register(VirtualVideo);
registry.Register(NoAudio);
registry.Register(VideoAudio);
registry.Register(VideoLoop);
registry.Register(AudioLoop);

/** Whether the source works with this ffmpeg version. */
export function isSupported(source: Source, ffversion: string): boolean {
	return SemverSatisfies(ffversion, source.ffversion);
}

/**
 * The sources offered for a stream type: known to the core (`knownSources`, the keys of `skills.sources`),
 * capable of the type and working with the ffmpeg version. Legacy SourceSelect > Select.
 */
export function availableSources(type: SourceCapability | string, knownSources: string[], ffversion: string): Source[] {
	const available: Source[] = [];

	for (const s of registry.List()) {
		if (!knownSources.includes(s.id)) {
			continue;
		}

		if (!s.capabilities.includes(type as SourceCapability)) {
			continue;
		}

		if (!isSupported(s, ffversion)) {
			continue;
		}

		available.push(s);
	}

	return available;
}

/** Legacy SourceSelect.initConfig: one config slice per source, {} unless the core config has one. */
export function initConfig(initialConfig?: Record<string, unknown> | null): Record<string, unknown> {
	let config: Record<string, unknown> = {};

	for (const s of registry.List()) {
		config[s.id] = {};
	}

	config = {
		...config,
		...initialConfig,
	};

	return config;
}

/** Legacy SourceSelect.init: the settings store of the select, holding the stored settings of the current source. */
export function initStore(source: { type?: string; settings?: unknown }): Record<string, unknown> {
	const settings: Record<string, unknown> = {};

	for (const id of registry.IDs()) {
		settings[id] = {};
	}

	// A source without a type lands under the key "undefined", as in legacy.
	settings[source.type as string] = source.settings;

	return settings;
}

/**
 * The devices the form of a source gets: `skills.sources[id]`, or none if the core does not know the source.
 * The legacy forms default the missing list to [] (their defaultProps).
 */
export function knownDevices(sources: Record<string, SourceDevice[] | undefined> | null | undefined, id: string): SourceDevice[] {
	return sources?.[id] ?? [];
}

export default registry;
