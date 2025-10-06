<template>
  <UContainer class="py-10 space-y-8">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-3xl font-semibold tracking-tight">Publications</h1>
        <p class="text-muted">Destinations where channels are distributed.</p>
      </div>
      <UButton icon="i-heroicons-plus" to="/publications/new">Add destination</UButton>
    </div>

    <UCard>
      <UTable :rows="rows" :columns="columns" empty-state="No publications configured." />
    </UCard>
  </UContainer>
</template>

<script setup lang="ts">
import { callOnce } from '#app';

const restreamer = useRestreamer();
await callOnce(restreamer.refresh);

const columns = [
  { key: 'name', label: 'Publication' },
  { key: 'destination', label: 'Destination' },
  { key: 'status', label: 'Status' },
];

const rows = computed(() =>
  restreamer.publications.value.map((item) => ({
    name: item.name,
    destination: item.destination,
    status: item.status,
  }))
);
</script>
