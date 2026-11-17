import Restreamer, { setAssetBase } from '#shared/core/restreamer';
import type { ChannelSummary, CoreClient } from '#shared/core/types';
import { resolveCoreAddressForTab } from '~/utils/coreAddress';

export type { ChannelSummary };

export interface Compatibility {
	compatible: boolean;
	core: { compatible: boolean; have: string; want: string };
	ffmpeg: { compatible: boolean; have: string; want: string };
}

interface SessionState {
	initialized: boolean;
	valid: boolean;
	connected: boolean;
	compatibility: Compatibility | null;
	ingest: boolean;
	passwordReset: boolean;
	address: string;
	name: string;
	version: string;
	auths: string[];
	channels: ChannelSummary[];
}

// The client keeps tokens, timers and Maps: one plain (non-reactive) instance per app.
let client: InstanceType<typeof Restreamer> | null = null;

/**
 * Single entry point to the datarhei-core client. The class itself is framework-free
 * (shared/core/restreamer.ts); this mirrors the bits of its state the UI renders from.
 */
export function useRestreamer() {
	const toast = useToast();
	const { t } = useI18n();

	const state = useState<SessionState>('restreamer', () => ({
		initialized: false,
		valid: false,
		connected: false,
		compatibility: null,
		ingest: false,
		passwordReset: false,
		address: '',
		name: '',
		version: '',
		auths: [],
		channels: [],
	}));

	function sync() {
		if (!client) return;
		state.value = {
			...state.value,
			connected: client.IsConnected(),
			compatibility: client.Compatibility(),
			ingest: client.HasIngest(),
			passwordReset: client.Auths().length === 0 && !client.ConfigOverrides('api.auth.enable'),
			address: client.Address(),
			name: client.Name() ?? '',
			version: client.Version()?.number ?? '',
			auths: client.Auths(),
			channels: client.IsConnected() ? (client.ListChannels() as ChannelSummary[]) : [],
		};
	}

	async function init() {
		if (client) return;

		const config = useRuntimeConfig();
		// The player/playersite templates the client uploads to the core live in this app's public/.
		setAssetBase(config.app.baseURL);
		client = new Restreamer(resolveCoreAddressForTab(window.location, config.public.coreAddress, window.sessionStorage));

		client.AddListener((event: { severity: 'error' | 'warning' | 'info' | 'success'; type: string; message: string }) => {
			if (event.severity === 'error' && event.type === 'network') {
				state.value = { ...state.value, initialized: true, valid: false };
			} else if (event.severity === 'error' && event.type === 'auth') {
				void logout();
			}

			toast.add({
				title: event.message,
				color: event.severity === 'warning' ? 'warning' : event.severity,
			});
		});

		const valid = await client.Validate();
		state.value = { ...state.value, initialized: true, valid };
		sync();
		void adminPass(client.IsConnected());
	}

	async function login(username: string, password: string): Promise<boolean> {
		if (!client) return false;
		const connected = await client.Login(username, password);
		sync();
		void adminPass(connected);
		return connected;
	}

	async function logout() {
		if (!client) return;
		void adminPass(false);
		state.value = { ...state.value, initialized: false, connected: false };

		client.Logout();
		client.Reset();

		const valid = await client.Validate();
		state.value = { ...state.value, initialized: true, valid };
		sync();
	}

	// Where the reverse proxy guards the core's stream files (see server/utils/viewer/direct.ts),
	// the previews need this server to know the browser is the admin's. Without that setup the
	// call changes nothing, and a failure only costs the previews.
	async function adminPass(signedIn: boolean) {
		try {
			if (!signedIn) {
				await $fetch('/api/viewer/admin-pass', { method: 'DELETE' });
				return;
			}
			const token = await accessToken();
			await $fetch('/api/viewer/admin-pass', { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {} });
		} catch {
			// see above
		}
	}

	/** The raw client, for pages that need the full API. Only valid after init(). */
	function api(): CoreClient {
		if (!client) {
			throw new Error(t('The connection to the core has not been initialized yet.'));
		}
		// The class is an untyped port; CoreClient describes the part of it the UI uses.
		return client as unknown as CoreClient;
	}

	/** The core access token of the signed-in admin ('' if the core needs none). */
	async function accessToken(): Promise<string> {
		const token = api().api.token;
		return typeof token === 'function' ? await token() : token;
	}

	return { state: readonly(state), init, login, logout, sync, api, accessToken };
}
