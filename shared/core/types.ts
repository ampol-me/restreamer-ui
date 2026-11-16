// Typed view of the core client (shared/core/restreamer.ts), which is still an untyped 1:1 port.
// Only what the UI uses is described here; extend it as pages are added.
import type { IngestMetadata } from '../metadata';

export type ProcessStateName = 'disconnected' | 'connecting' | 'connected' | 'disconnecting' | 'error';

/** Result of Get*Progress(), see _getProgressFromState(). */
export interface ProcessProgress {
	valid: boolean;
	order: 'start' | 'stop' | string;
	state: ProcessStateName;
	error: string;
	// Seconds until the core restarts the process; -1 = it will not.
	reconnect: number;
	bitrate: number;
	fps: number;
	time: number;
	speed: number;
	q: number;
	frames: number;
	drop: number;
	dup: number;
	command: string[];
	cpu: number;
	memory: number;
}

export interface ProcessLog {
	created_at?: number;
	prelude?: unknown[];
	log?: unknown[];
}

export interface ChannelInfo {
	id: string;
	channelid: string;
	name: string;
	available: boolean;
	egresses: Map<string, unknown> | string[];
}

export interface ChannelSummary {
	id: string;
	channelid: string;
	name: string;
	available: boolean;
	thumbnail: string;
	egresses: string[];
}

export interface EgressProcess {
	id: string;
	name: string;
	service: string;
	index: string | number;
	progress: ProcessProgress;
}

export interface SessionSummary {
	sessions: number;
	bitrate_kbit: number;
}

export interface CoreNetworkConfig {
	rtmp: { enabled: boolean; [key: string]: unknown };
	srt: { enabled: boolean; [key: string]: unknown };
}

export interface CoreActiveConfig {
	hostname: string;
	source: { network: CoreNetworkConfig };
	[key: string]: unknown;
}

export type ChannelAddressKind = 'hls+memfs' | 'hls+diskfs' | 'snapshot+memfs' | 'snapshot+diskfs' | 'player';
export type PublicAddressKind = ChannelAddressKind | 'rtmp' | 'srt';

export interface CoreClient {
	// The API client it wraps (shared/core/api.ts).
	api: { token: string | (() => Promise<string>) };

	ConfigActive(): CoreActiveConfig;

	CreateChannel(name: string): string;
	SelectChannel(channelid: string): string;
	GetCurrentChannelID(): string;
	GetChannel(channelid: string): ChannelInfo | null;
	ListChannels(): ChannelSummary[];
	GetChannelAddress(what: ChannelAddressKind, channelid: string): string;
	GetPublicAddress(what: PublicAddressKind, channelid: string): string;

	GetIngestMetadata(channelid: string): Promise<IngestMetadata>;
	GetIngestProgress(channelid: string): Promise<ProcessProgress>;
	GetIngestLog(channelid: string): Promise<ProcessLog | null>;
	GetIngestDebug(channelid: string): Promise<unknown>;
	StartIngest(channelid: string): Promise<boolean>;
	StopIngest(channelid: string): Promise<boolean>;
	StartIngestSnapshot(channelid: string): Promise<boolean>;
	StopIngestSnapshot(channelid: string): Promise<boolean>;

	ListIngestEgresses(channelid: string, services?: string[]): Promise<EgressProcess[]>;
	StartEgress(channelid: string, id: string): Promise<boolean>;
	StopEgress(channelid: string, id: string): Promise<boolean>;
	StopAllEgresses(channelid: string): Promise<void>;

	CurrentSessions(protocols: string[]): Promise<SessionSummary>;
}

/** What a page shows before the first poll returns. */
export const emptyProgress = (): ProcessProgress => ({
	valid: false,
	order: 'stop',
	state: 'disconnected',
	error: '',
	reconnect: -1,
	bitrate: 0,
	fps: 0,
	time: 0,
	speed: 0,
	q: -1,
	frames: 0,
	drop: 0,
	dup: 0,
	command: [],
	cpu: 0,
	memory: 0,
});
