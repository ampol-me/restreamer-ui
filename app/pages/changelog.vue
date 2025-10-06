<template>
  <UContainer class="py-10 space-y-8">
    <div>
      <h1 class="text-3xl font-semibold tracking-tight">Changelog</h1>
      <p class="text-muted">What changed in recent releases.</p>
    </div>

    <UCard>
      <template #header>
        <h2 class="text-lg font-semibold">Latest releases</h2>
      </template>
      <TimelineEntries />
    </UCard>
  </UContainer>
</template>

<script setup lang="ts">
import TimelineEntries from '~/components/TimelineEntries.vue';
</script>
