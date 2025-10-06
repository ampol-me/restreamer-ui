import { API } from './api';

export interface RestreamerOverview {
  id: string;
  name: string;
  version: string;
  createdAt?: string;
  channels: number;
  publications: number;
  status: 'online' | 'offline' | 'degraded';
}

export interface ChannelSummary {
  id: string;
  name: string;
  status: 'running' | 'stopped' | 'error';
  bitrate?: number;
  updatedAt?: string;
}

export interface PublicationSummary {
  id: string;
  name: string;
  destination: string;
  status: 'streaming' | 'idle' | 'error';
}

export class RestreamerClient {
  private api: API;

  constructor(address: string) {
    this.api = new API(address);
  }

  setAddress(address: string) {
    this.api.setAddress(address);
  }

  async getOverview(): Promise<RestreamerOverview | null> {
    const res = await this.api.get<RestreamerOverview>('/status', { expect: 'json' });
    return res.err ? null : (res.val as RestreamerOverview);
  }

  async listChannels(): Promise<ChannelSummary[]> {
    const res = await this.api.get<ChannelSummary[]>('/channels', { expect: 'json' });
    return res.err || !res.val ? [] : res.val;
  }

  async listPublications(): Promise<PublicationSummary[]> {
    const res = await this.api.get<PublicationSummary[]>('/publications', { expect: 'json' });
    return res.err || !res.val ? [] : res.val;
  }
}
