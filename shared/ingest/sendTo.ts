// Where an encoder (OBS, vMix, a hardware encoder) has to send its stream for a channel that
// waits for one on the internal RTMP or SRT server. Shown on the channel page: it is the first
// thing needed after such a channel is created.
import * as Network from '../sources/network';

export interface SendTarget {
	protocol: 'rtmp' | 'srt';
	/** The complete address, for software that takes one field. */
	address: string;
	/** RTMP only: the two fields most software asks for. The key carries the access token, if one is set. */
	server?: string;
	key?: string;
}

interface VideoSource {
	type?: string;
	settings?: { mode?: string; push?: { type?: string; name?: string } };
}

/**
 * `source`: the channel's video source; `networkConfig`: the core's config slice of the network
 * source for this channel. Null unless the channel waits for a stream sent to its own address
 * (a channel that reads a stream already published under another name has nothing to hand out).
 */
export function sendTarget(source: VideoSource | undefined, networkConfig: unknown): SendTarget | null {
	const push = source?.settings?.push;
	if (source?.type !== Network.id || source.settings?.mode !== 'push' || !push) return null;

	const config = Network.initConfig(networkConfig);
	if (push.name !== config.channelid) return null;

	if (push.type === 'rtmp' && config.rtmp.enabled) {
		const address = Network.getRTMP(config);
		// rtmp(s)://host/app/<channel>.stream[/token]: everything after the application is the key.
		const server = `rtmp${config.rtmp.secure ? 's' : ''}://${config.rtmp.host}${config.rtmp.app}`;
		return { protocol: 'rtmp', address, server, key: address.slice(server.length + 1) };
	}

	if (push.type === 'srt' && config.srt.enabled) {
		return { protocol: 'srt', address: Network.getSRT(config) };
	}

	return null;
}
