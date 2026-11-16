// Typed view of what the publication (egress) pages use from the core client (shared/core/restreamer.ts),
// next to CoreClient in ./types.ts. Obtain it with `useRestreamer().api() as unknown as PublicationCoreClient`.
import type { EgressMetadata, MetadataIO } from '../metadata';
import type { ServiceOutput } from '../services/types';
import type { CoreSkills as BaseCoreSkills, CoreClient, ProcessLog, ProcessProgress } from './types';

/** Result of Skills(), see _initSkills(): the general view plus what the publication services are matched against. */
export interface CoreSkills extends BaseCoreSkills {
	// codec -> encoders of that codec
	codecs: { audio: Record<string, string[]>; video: Record<string, string[]> };
	sinks: Record<string, unknown[]>;
}

/** Result of conflateServiceSkills(): what the core can do of what a service requires. */
export interface ServiceSkills {
	ffmpeg: CoreSkills['ffmpeg'];
	protocols: string[];
	formats: string[];
	devices: Record<string, unknown[]>;
	codecs: { audio: string[]; video: string[] };
}

/** Result of GetEgress(), see _sanitizeProcess(). */
export interface EgressProcessState {
	id: string;
	progress: ProcessProgress;
	[key: string]: unknown;
}

export type EgressControl = EgressMetadata['control'];

// What _upsertProcess() answers: [value, null] or [null, { message }].
export type UpsertResult = [unknown, { message: string } | null];

export interface PublicationClient {
	Skills(): CoreSkills;

	GetEgressId(service: string, index: string): string;
	// undefined: unknown channel, null: unknown egress or the request failed.
	GetEgress(channelid: string, id: string, filter?: string[]): Promise<EgressProcessState | null | undefined>;
	GetEgressMetadata(channelid: string, id: string): Promise<EgressMetadata>;
	SetEgressMetadata(channelid: string, id: string, metadata: EgressMetadata): Promise<boolean | null>;
	GetEgressLog(channelid: string, id: string): Promise<ProcessLog | null>;
	GetEgressDebug(channelid: string, id: string): Promise<unknown>;
	// null: unknown channel or egress.
	DeleteEgress(channelid: string, id: string): Promise<boolean | null>;
	// null: unknown channel or egress.
	UpdateEgress(
		channelid: string,
		id: string,
		global: string[],
		inputs: MetadataIO[],
		outputs: ServiceOutput[],
		control: EgressControl,
	): Promise<UpsertResult | null>;
	// Answers [id, error].
	CreateEgress(
		channelid: string,
		service: string,
		global: string[],
		inputs: MetadataIO[],
		outputs: ServiceOutput[],
		control: EgressControl,
	): Promise<[string, { message: string } | null]>;
}

// CoreClient's Skills() answers the general view; here the publication one has to win.
export type PublicationCoreClient = Omit<CoreClient, 'Skills'> & PublicationClient;
