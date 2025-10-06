<template>
  <UContainer class="py-10 space-y-8">
    <div>
      <h1 class="text-3xl font-semibold tracking-tight">New Publication</h1>
      <p class="text-muted">Connect a channel to an external platform.</p>
    </div>

    <UCard>
      <form class="space-y-6" @submit.prevent="submit">
        <UFormGroup label="Name" required>
          <UInput v-model="form.name" placeholder="YouTube Live" />
        </UFormGroup>

        <UFormGroup label="Destination URL" required>
          <UInput v-model="form.destination" placeholder="rtmp://a.rtmp.youtube.com/live2" />
        </UFormGroup>

        <UFormGroup label="Channel" required>
          <USelect v-model="form.channelId" :options="channelOptions" placeholder="Select channel" />
        </UFormGroup>

        <UFormGroup label="Auto start">
          <UToggle v-model="form.autoStart" />
        </UFormGroup>

        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" to="/publications">Cancel</UButton>
          <UButton type="submit" :loading="isSubmitting" icon="i-heroicons-check-circle">
            Save publication
          </UButton>
        </div>
      </form>
    </UCard>
  </UContainer>
</template>

<script setup lang="ts">
import { callOnce } from '#app';

const restreamer = useRestreamer();
await callOnce(restreamer.refresh);

const channelOptions = computed(() =>
  restreamer.channels.value.map((channel) => ({
    label: channel.name,
    value: channel.id,
  }))
);

const isSubmitting = ref(false);

const form = reactive({
  name: '',
  destination: '',
  channelId: undefined as string | undefined,
  autoStart: true,
});

const submit = async () => {
  isSubmitting.value = true;
  try {
    await $fetch('/api/publications', {
      method: 'POST',
      body: form,
    });
    await navigateTo('/publications');
  } finally {
    isSubmitting.value = false;
  }
};
</script>
