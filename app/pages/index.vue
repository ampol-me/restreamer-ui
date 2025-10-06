<template>
  <UContainer class="py-10 space-y-8">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p class="text-muted">Live status of the Restreamer service and active channels.</p>
      </div>
      <UButton :loading="isLoading" icon="i-heroicons-arrow-path" @click="refresh">
        Refresh
      </UButton>
    </div>

    <UAlert v-if="error" color="error" icon="i-heroicons-exclamation-triangle">
      <template #description>
        {{ error }}
      </template>
    </UAlert>

    <div v-if="isLoading" class="grid gap-4 md:grid-cols-3">
      <USkeleton class="h-32" repeat="3" />
    </div>

    <template v-else>
      <section class="grid gap-4 md:grid-cols-3">
        <UCard>
          <template #header>
            <div class="flex items-center gap-2 text-sm text-muted">
              <UIcon name="i-heroicons-signal" />
              Overview
            </div>
          </template>
          <div class="space-y-2">
            <p class="text-xl font-semibold">{{ overview?.name ?? 'Unknown node' }}</p>
            <p class="text-sm text-muted">Version {{ overview?.version ?? 'n/a' }}</p>
            <UBadge :color="statusBadge.color" variant="soft">
              {{ statusBadge.label }}
            </UBadge>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <div class="flex items-center gap-2 text-sm text-muted">
              <UIcon name="i-heroicons-rectangle-stack" />
              Channels
            </div>
          </template>
          <div class="space-y-2">
            <p class="text-4xl font-semibold">{{ channels.length }}</p>
            <p class="text-sm text-muted">Configured streaming pipelines.</p>
            <NuxtLink to="/channels" class="text-primary hover:underline">Manage channels</NuxtLink>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <div class="flex items-center gap-2 text-sm text-muted">
              <UIcon name="i-heroicons-rss" />
              Publications
            </div>
          </template>
          <div class="space-y-2">
            <p class="text-4xl font-semibold">{{ publications.length }}</p>
            <p class="text-sm text-muted">Active outputs to viewers and platforms.</p>
            <NuxtLink to="/publications" class="text-primary hover:underline">Manage publications</NuxtLink>
          </div>
        </UCard>
      </section>

      <section>
        <header class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-semibold">Channel Activity</h2>
          <UBadge variant="subtle">{{ channels.length }} tracked</UBadge>
        </header>
        <UCard>
          <UTable :rows="channelRows" :columns="channelColumns" empty-state="No channels found." />
        </UCard>
      </section>

      <section>
        <header class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-semibold">Publication Destinations</h2>
          <UBadge variant="subtle">{{ publications.length }} targets</UBadge>
        </header>
        <UCard>
          <UTable :rows="publicationRows" :columns="publicationColumns" empty-state="No publications configured." />
        </UCard>
      </section>
    </template>
  </UContainer>
</template>

<script setup lang="ts">
import { callOnce } from '#app';
import type { TableColumn } from '#ui/types';

const { overview, channels, publications, status, error, refresh } = useRestreamer();

await callOnce(refresh);

const isLoading = computed(() => status.value === 'loading' || status.value === 'idle');

const statusBadge = computed(() => {
  const current = overview.value?.status ?? 'offline';

  if (current === 'online') {
    return { label: 'Online', color: 'success' as const };
  }

  if (current === 'degraded') {
    return { label: 'Degraded', color: 'warning' as const };
  }

  return { label: 'Offline', color: 'error' as const };
});

type ChannelRow = {
  name: string;
  status: string;
  bitrate: string;
  updatedAt: string;
};

const channelColumns: TableColumn<ChannelRow>[] = [
  { header: 'Channel', accessorKey: 'name' },
  { header: 'Status', accessorKey: 'status' },
  { header: 'Bitrate', accessorKey: 'bitrate' },
  { header: 'Updated', accessorKey: 'updatedAt' },
];

const channelRows = computed<ChannelRow[]>(() =>
  channels.value.map((channel) => ({
    name: channel.name,
    status: channel.status,
    bitrate: channel.bitrate ? `${channel.bitrate} kbps` : 'n/a',
    updatedAt: channel.updatedAt ? new Date(channel.updatedAt).toLocaleString() : 'n/a',
  }))
);

type PublicationRow = {
  name: string;
  destination: string;
  status: string;
};

const publicationColumns: TableColumn<PublicationRow>[] = [
  { header: 'Publication', accessorKey: 'name' },
  { header: 'Destination', accessorKey: 'destination' },
  { header: 'Status', accessorKey: 'status' },
];

const publicationRows = computed<PublicationRow[]>(() =>
  publications.value.map((item) => ({
    name: item.name,
    destination: item.destination,
    status: item.status,
  }))
);
</script>
