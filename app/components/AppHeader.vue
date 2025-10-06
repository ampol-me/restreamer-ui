<template>
  <header class="border-b border-border/60 bg-background/80 backdrop-blur">
    <UContainer class="py-4 flex flex-wrap items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <UButton to="/" color="primary" variant="soft" icon="i-heroicons-play-circle" aria-label="Go to dashboard" />
        <div>
          <NuxtLink to="/" class="text-xl font-semibold tracking-tight">
            Restreamer Control
          </NuxtLink>
          <p class="text-sm text-muted">Manage channels, publications, and system status.</p>
        </div>
      </div>
      <div class="flex items-center gap-4">
        <nav class="hidden md:flex items-center gap-3 text-sm">
          <NuxtLink
            v-for="link in links"
            :key="link.to"
            :to="link.to"
            class="px-3 py-1 rounded-md transition-colors hover:bg-primary/10"
          >
            {{ link.label }}
          </NuxtLink>
        </nav>
        <UButton :icon="colorModeIcon" variant="ghost" aria-label="Toggle color mode" @click="toggleColorMode" />
      </div>
    </UContainer>
  </header>
</template>

<script setup lang="ts">
const colorMode = useColorMode();

const links = [
  { label: 'Dashboard', to: '/' },
  { label: 'Channels', to: '/channels' },
  { label: 'Settings', to: '/settings' },
  { label: 'Help', to: '/help' },
] as const;

const colorModeIcon = computed(() =>
  colorMode.value === 'dark' ? 'i-heroicons-sun' : 'i-heroicons-moon'
);

const toggleColorMode = () => {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark';
};
</script>
