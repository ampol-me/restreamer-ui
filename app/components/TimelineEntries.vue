<template>
  <div class="space-y-6">
    <div v-for="entry in entries" :key="entry.version" class="border-l border-border pl-6 relative">
      <div class="absolute -left-1.5 top-1 w-3 h-3 rounded-full bg-primary" />
      <div class="flex flex-wrap items-center gap-2">
        <span class="text-lg font-semibold">{{ entry.version }}</span>
        <UBadge variant="subtle">{{ entry.date }}</UBadge>
      </div>
      <ul class="mt-3 list-disc pl-5 space-y-2 text-sm">
        <li v-for="item in entry.changes" :key="item">{{ item }}</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
const entries = [
  {
    version: '2.0.0',
    date: '2024-10-01',
    changes: [
      'Migrated UI to Nuxt 4 with Bun tooling.',
      'Adopted @nuxt/ui components for unified styling.',
      'Introduced modular REST client composables.',
    ],
  },
  {
    version: '1.14.0',
    date: '2024-08-24',
    changes: [
      'Improved Chromecast compatibility.',
      'Updated locale catalogs.',
      'Stabilized authentication renewals.',
    ],
  },
];
</script>
