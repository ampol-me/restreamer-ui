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
      <div class="flex items-center gap-2">
        <UHorizontalNavigation :links="links" class="hidden md:flex" />
        <UButton :icon="colorModeIcon" variant="ghost" aria-label="Toggle color mode" @click="toggleColorMode" />
      </div>
    </UContainer>
  </header>
</template>

<script setup lang="ts">
const colorMode = useColorMode();

const links = computed(() => [
  { label: 'Dashboard', to: '/' },
  { label: 'Channels', to: '/channels' },
  { label: 'Settings', to: '/settings' },
  { label: 'Help', to: '/help' },
]);

const colorModeIcon = computed(() =>
  colorMode.value === 'dark' ? 'i-heroicons-sun' : 'i-heroicons-moon'
);

const toggleColorMode = () => {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark';
};
</script>
