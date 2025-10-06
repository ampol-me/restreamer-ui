<template>
  <UContainer class="py-10 space-y-8">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-3xl font-semibold tracking-tight">Channels</h1>
        <p class="text-muted">Create, edit, and monitor channel pipelines.</p>
      </div>
      <UButton icon="i-heroicons-plus" to="/channels/new">New channel</UButton>
    </div>

    <ChannelList />
  </UContainer>
</template>

<script setup lang="ts">
import ChannelList from '~/components/ChannelList.vue';
</script>
