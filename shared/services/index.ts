// Ported from legacy/src/views/Publication/Services/index.js
import Akamai from './akamai';
import Azure from './azure';
import Brightcove from './brightcove';
import CDN77 from './cdn77';
import Core from './core';
import DaCast from './dacast';
import Dailymotion from './dailymotion';
import DASH from './dash';
import DLive from './dlive';
import Facebook from './facebook';
import Framebuffer from './framebuffer';
import HLS from './hls';
import Icecast from './icecast';
import Image2 from './image2';
import Instagram from './instagram';
import Kick from './kick';
import Linkedin from './linkedin';
import Livepush from './livepush';
import Livespotting from './livespotting';
import MediaNetwork from './medianetwork';
import MPEGTS from './mpegts';
import NimoTv from './nimotv';
import Owncast from './owncast';
import PeerTube from './peertube';
import PicartoTv from './picartotv';
import Red5 from './red5';
import Restream from './restream';
import RTMP from './rtmp';
import RTSP from './rtsp';
import Rumble from './rumble';
import SRT from './srt';
import Telegram from './telegram';
import Trovo from './trovo';
import Twitch from './twitch';
import Twitter from './twitter';
import UDP from './udp';
import Vimeo from './vimeo';
import Wettercom from './wettercom';
import WOWZA from './wowza';
import Youtube from './youtube';
import type { Service } from './types';

export type * from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */

export class Registry {
	services: Map<string, Service<any>>;

	constructor() {
		this.services = new Map();
	}

	Register(service: Service<any>): void {
		if (service.id.match(/[^0-9a-z]/)) {
			console.warn(`the service.id "${service.id}" is invalid. only [0-9a-z] is allowed.`);
			return;
		}

		this.services.set(service.id, service);
	}

	Get(id: string): Service<any> | null {
		const service = this.services.get(id);
		if (service) {
			return service;
		}

		return null;
	}

	IDs(): string[] {
		return Array.from(this.services.keys());
	}

	List(): Service<any>[] {
		return Array.from(this.services.values());
	}
}

const registry = new Registry();

// The order the services are registered is relevant, i.e. on
// the "add service" screen they appear in this order.
registry.Register(Facebook);
registry.Register(Youtube);
registry.Register(Twitter);
registry.Register(Twitch);
registry.Register(Kick);
registry.Register(Instagram);
registry.Register(Vimeo);
registry.Register(Restream);
registry.Register(Telegram);
registry.Register(Linkedin);
registry.Register(DLive);
registry.Register(Trovo);
registry.Register(PicartoTv);
registry.Register(NimoTv);
registry.Register(PeerTube);
registry.Register(MediaNetwork);
registry.Register(Livespotting);
registry.Register(Wettercom);
registry.Register(Azure);
registry.Register(Brightcove);
registry.Register(Akamai);
registry.Register(DaCast);
registry.Register(Dailymotion);
registry.Register(Livepush);
registry.Register(Rumble);
registry.Register(CDN77);
registry.Register(Core);
registry.Register(Owncast);
registry.Register(WOWZA);
registry.Register(Red5);
registry.Register(Icecast);
registry.Register(Image2);
registry.Register(RTSP);
registry.Register(RTMP);
registry.Register(HLS);
registry.Register(DASH);
registry.Register(SRT);
registry.Register(UDP);
registry.Register(MPEGTS);
registry.Register(Framebuffer);

export default registry;
