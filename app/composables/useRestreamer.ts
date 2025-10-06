import { RestreamerClient, type ChannelSummary, type PublicationSummary, type RestreamerOverview } from '~/lib/restreamer';

let client: RestreamerClient | null = null;

const createClient = () => {
  if (client) {
    return client;
  }

  const config = useRuntimeConfig();
  const fallback = import.meta.client ? window.location.origin : 'http://localhost:3000';
  const address = config.public.apiBase || fallback;

  client = new RestreamerClient(address);
  return client;
};

export const useRestreamer = () => {
  const overview = useState<RestreamerOverview | null>('restreamer-overview', () => null);
  const channels = useState<ChannelSummary[]>('restreamer-channels', () => []);
  const publications = useState<PublicationSummary[]>('restreamer-publications', () => []);
  const status = useState<'idle' | 'loading' | 'ready' | 'error'>('restreamer-state', () => 'idle');
  const error = useState<string | null>('restreamer-error', () => null);

  const refresh = async () => {
    status.value = 'loading';
    error.value = null;

    try {
      const api = createClient();
      const [overviewData, channelData, publicationData] = await Promise.all([
        api.getOverview(),
        api.listChannels(),
        api.listPublications(),
      ]);

      overview.value = overviewData;
      channels.value = channelData;
      publications.value = publicationData;
      status.value = 'ready';
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      error.value = message;
      status.value = 'error';
    }
  };

  return {
    overview,
    channels,
    publications,
    status,
    error,
    refresh,
  };
};
