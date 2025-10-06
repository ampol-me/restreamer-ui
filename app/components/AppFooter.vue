<template>
  <footer class="border-t border-border/60 bg-background/80">
    <UContainer class="py-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted">
      <span>&copy; {{ currentYear }} Restreamer UI</span>
      <div class="flex items-center gap-4">
        <NuxtLink to="/changelog" class="hover:underline">Changelog</NuxtLink>
        <NuxtLink to="/status" class="hover:underline">System Status</NuxtLink>
        <NuxtLink to="/support" class="hover:underline">Support</NuxtLink>
      </div>
    </UContainer>
  </footer>
</template>

<script setup lang="ts">
const currentYear = new Date().getFullYear();
</script>
