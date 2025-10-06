import { getStore } from './_storage';

export default defineEventHandler(() => {
  const store = getStore();
  return {
    id: store.overview.id,
    name: store.overview.name,
    version: store.overview.version,
    createdAt: store.overview.createdAt,
    channels: store.channels.length,
    publications: store.publications.length,
    status: store.overview.status,
  };
});
