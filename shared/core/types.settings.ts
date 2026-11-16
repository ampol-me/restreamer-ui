// The part of the core client (shared/core/restreamer.ts) the system settings use, next to CoreClient.
import type { ConfigSetError, CoreConfig, CoreConfigResponse } from '../settings/config';

/** Result of About(), see _initAbout(). `id` is empty while the API wants a login. */
export interface CoreAbout {
	app?: string;
	id: string;
	name: string;
	created_at: Date | null;
	version: { number: string; [key: string]: unknown };
	auths: string[];
}

export interface SettingsClient {
	/** Start time of the core as of the last Validate()/Login(). */
	CreatedAt(): Date | null;
	About(): Promise<CoreAbout | null>;
	Validate(): Promise<boolean>;
	Login(username: string, password: string): Promise<boolean>;
	/** While on, failed calls raise no events (no toasts, no logout) – for the restart. */
	IgnoreAPIErrors(toggle: boolean): void;

	/** The stored config (not necessarily the one the core runs with); null if it could not be loaded. */
	Config(): Promise<CoreConfigResponse | null>;
	ConfigSet(config: CoreConfig): Promise<[unknown, ConfigSetError | null]>;
	/** Makes the core restart with the stored config. False if the core refused. */
	ConfigReload(): Promise<boolean>;
	ConfigOverrides(name: string): boolean;
	ConfigValue(name: string): unknown;

	/** The system log, one entry per line. */
	Log(): Promise<unknown[]>;

	Skills(): Record<string, unknown>;
	RefreshSkills(): Promise<void>;

	IsExpert(): boolean;
	SetExpert(value: boolean): void;
	CheckForUpdates(): boolean;
	SetCheckForUpdates(value: boolean): void;
	HasUpdates(): boolean;
	HasService(): boolean;
}
