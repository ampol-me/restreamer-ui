// Ported from legacy/src/views/Edit/Wizard/Sources/index.js and the source list of legacy/src/views/Edit/Wizard/index.js
import * as AVFoundation from './avfoundation';
import * as InternalRTMP from './internalrtmp';
import * as InternalSRT from './internalsrt';
import * as Network from './network';
import * as Raspicam from './raspicam';
import * as V4L from './v4l';
import type { WizardSource } from './types';

export type * from './types';

export class Registry {
	services: Map<string, WizardSource>;

	constructor() {
		this.services = new Map();
	}

	Register(service: WizardSource): void {
		this.services.set(service.id, service);
	}

	Get(id: string): WizardSource | null {
		const service = this.services.get(id);
		if (service) {
			return service;
		}

		return null;
	}

	IDs(): string[] {
		return Array.from(this.services.keys());
	}

	List(): WizardSource[] {
		return Array.from(this.services.values());
	}
}

const registry = new Registry();

// As in legacy, the HLS server source (./internalhls) is not registered.
registry.Register(Network);
registry.Register(InternalRTMP);
registry.Register(InternalSRT);
registry.Register(AVFoundation);
registry.Register(Raspicam);
registry.Register(V4L);

interface WizardSkills {
	sources: Record<string, unknown>;
	protocols: { input: string[] };
}

/**
 * The ids of the wizard sources this core can ingest from: the network source brings the internal
 * servers whose protocol ffmpeg can read. Contains 'hls', for which no wizard source is registered.
 */
export function knownSources(skills: WizardSkills): string[] {
	const knownSources: string[] = [];
	for (const s in skills.sources) {
		if (s === 'network') {
			knownSources.push('network');
			if (skills.protocols.input.includes('rtmp')) {
				knownSources.push('rtmp');
			}
			if (skills.protocols.input.includes('http')) {
				knownSources.push('hls');
			}
			if (skills.protocols.input.includes('srt')) {
				knownSources.push('srt');
			}
		} else if (s === 'video4linux2') {
			knownSources.push('video4linux2');
		} else if (s === 'raspicam') {
			knownSources.push('raspicam');
		} else if (s === 'avfoundation') {
			knownSources.push('avfoundation');
		}
	}

	return knownSources;
}

/** The wizard sources offered for this core, in registry order. */
export function availableSources(skills: WizardSkills): WizardSource[] {
	const known = knownSources(skills);

	return registry.List().filter((s) => known.indexOf(s.id) !== -1);
}

export default registry;
