// The part of the core client (shared/core/restreamer.ts) the player and playersite pages use.
import type { IngestMetadata, Metadata } from '../metadata';
import type { PlayerSettings, PlayersiteSettings } from '../player/settings';
import type { ProcessProgress } from './types';

/** Result of GetIngest(), see _sanitizeProcess(). */
export interface IngestProcess {
	id: string;
	progress: ProcessProgress;
	// The stored metadata as it is: {} for a process that never had any.
	metadata: Partial<IngestMetadata>;
}

export interface PlayerClient {
	Address(): string;
	HasIngest(): boolean;

	GetIngest(channelid: string, filter?: string[]): Promise<IngestProcess | null>;
	SetIngestMetadata(channelid: string, metadata: Partial<IngestMetadata>): Promise<boolean>;

	InitPlayerSettings(initSettings?: Partial<PlayerSettings> | null): PlayerSettings;
	UpdatePlayer(channelid: string): Promise<boolean>;
	GetPublicIframeCode(channelid: string): string;
	// Both return the path of the stored file on the core ('' for an unknown channel).
	UploadLogo(channelid: string, data: ArrayBuffer, extension: string): Promise<string>;
	UploadPoster(channelid: string, data: ArrayBuffer, extension: string): Promise<string>;

	GetMetadata(defaults?: boolean): Promise<Metadata>;
	SetMetadata(metadata: Metadata): Promise<boolean>;

	InitPlayersiteSettings(initSettings?: Partial<PlayersiteSettings> | null): PlayersiteSettings;
	GetPlayersiteUrl(): string;
	HasPlayersite(): Promise<boolean>;
	UpdatePlayersite(): Promise<boolean>;
	UploadPlayersiteBackgroundImage(data: ArrayBuffer, extension: string): Promise<string>;
	// Returns the sanitized name the template was stored under.
	UploadPlayersiteTemplate(data: ArrayBuffer, name: string): Promise<string>;
	DeletePlayersiteTemplate(name: string): Promise<boolean>;
	ListPlayersiteTemplates(): Promise<string[]>;
}
