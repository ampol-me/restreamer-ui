const createId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

export type ChannelStatus = 'running' | 'stopped' | 'error';
export type PublicationStatus = 'streaming' | 'idle' | 'error';
export type NodeStatus = 'online' | 'offline' | 'degraded';

export interface Channel {
  id: string;
  name: string;
  source: string;
  profile: string;
  autoStart: boolean;
  status: ChannelStatus;
  bitrate?: number;
  updatedAt?: string;
}

export interface Publication {
  id: string;
  name: string;
  destination: string;
  channelId?: string;
  autoStart: boolean;
  status: PublicationStatus;
}

interface RestreamerStore {
  channels: Channel[];
  publications: Publication[];
  overview: {
    id: string;
    name: string;
    version: string;
    status: NodeStatus;
    createdAt: string;
  };
}

declare global {
  // eslint-disable-next-line no-var
  var __restreamerStore: RestreamerStore | undefined;
}

const initStore = (): RestreamerStore => ({
  channels: [
    {
      id: createId(),
      name: 'Primary ingest',
      source: 'rtmp://encoder.local/live',
      profile: '1080p',
      autoStart: true,
      status: 'running',
      bitrate: 4500,
      updatedAt: new Date().toISOString(),
    },
  ],
  publications: [
    {
      id: createId(),
      name: 'YouTube Live',
      destination: 'rtmp://a.rtmp.youtube.com/live2',
      autoStart: true,
      status: 'streaming',
    },
  ],
  overview: {
    id: createId(),
    name: 'Local Restreamer',
    version: '2.0.0-dev',
    status: 'online',
    createdAt: new Date().toISOString(),
  },
});

export const getStore = () => {
  if (!globalThis.__restreamerStore) {
    globalThis.__restreamerStore = initStore();
  }
  return globalThis.__restreamerStore;
};

export const addChannel = (channel: Omit<Channel, 'id' | 'status' | 'updatedAt'> & { bitrate?: number }) => {
  const store = getStore();
  const record: Channel = {
    id: createId(),
    status: 'running',
    updatedAt: new Date().toISOString(),
    ...channel,
  };
  store.channels.push(record);
  return record;
};

export const addPublication = (publication: Omit<Publication, 'id' | 'status'>) => {
  const store = getStore();
  const record: Publication = {
    id: createId(),
    status: 'streaming',
    ...publication,
  };
  store.publications.push(record);
  return record;
};
