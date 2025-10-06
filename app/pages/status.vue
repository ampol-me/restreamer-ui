<template>
  <UContainer class="py-10 space-y-8">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-3xl font-semibold tracking-tight">System Status</h1>
        <p class="text-muted">Live health of nodes, workers, and services.</p>
      </div>
      <UButton icon="i-heroicons-arrow-path" :loading="isRefreshing" @click="refresh">
        Refresh
      </UButton>
    </div>

    <UCard>
      <template #header>
        <h2 class="text-lg font-semibold">Nodes</h2>
      </template>
      <UTable :rows="rows" :columns="columns" empty-state="No nodes reported." />
    </UCard>
  </UContainer>
</template>

<script setup lang="ts">
import { callOnce } from '#app';

const restreamer = useRestreamer();
const isRefreshing = ref(false);
await callOnce(restreamer.refresh);

const columns = [
  { key: 'name', label: 'Node' },
  { key: 'status', label: 'Status' },
  { key: 'channels', label: 'Channels' },
  { key: 'publications', label: 'Publications' },
];

const rows = computed(() =>
  restreamer.overview.value
    ? [
        {
          name: restreamer.overview.value.name,
          status: restreamer.overview.value.status,
          channels: restreamer.channels.value.length,
          publications: restreamer.publications.value.length,
        },
      ]
    : []
);

const refresh = async () => {
  isRefreshing.value = true;
  await restreamer.refresh();
  isRefreshing.value = false;
};
</script>
