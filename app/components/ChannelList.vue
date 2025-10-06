<template>
  <UCard>
    <template #header>
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 class="text-lg font-semibold">Channels</h2>
          <p class="text-sm text-muted">Monitor ingest status and quick actions.</p>
        </div>
        <UInput v-model="search" icon="i-heroicons-magnifying-glass" placeholder="Search channels" class="w-full md:w-64" />
      </div>
    </template>

    <UTable :rows="rows" :columns="columns" empty-state="No channels match." />
  </UCard>
</template>

<script setup lang="ts">
import { callOnce } from '#app';
import type { TableColumn } from '#ui/types';

const restreamer = useRestreamer();
await callOnce(restreamer.refresh);

const search = ref('');

type ChannelRow = {
  name: string;
  status: string;
  bitrate: string;
  updatedAt: string;
};

const columns: TableColumn<ChannelRow>[] = [
  { header: 'Channel', accessorKey: 'name' },
  { header: 'Status', accessorKey: 'status' },
  { header: 'Bitrate', accessorKey: 'bitrate' },
  { header: 'Updated', accessorKey: 'updatedAt' },
];

const rows = computed<ChannelRow[]>(() =>
  restreamer.channels.value
    .filter((channel) =>
      channel.name.toLowerCase().includes(search.value.trim().toLowerCase())
    )
    .map((channel) => ({
      name: channel.name,
      status: channel.status,
      bitrate: channel.bitrate ? `${channel.bitrate} kbps` : 'n/a',
      updatedAt: channel.updatedAt ? new Date(channel.updatedAt).toLocaleTimeString() : 'n/a',
    }))
);
</script>
