<template>
  <UContainer class="py-10 space-y-8">
    <div>
      <h1 class="text-3xl font-semibold tracking-tight">Create Channel</h1>
      <p class="text-muted">Define input, transcoding, and publication targets.</p>
    </div>

    <UCard>
      <form class="space-y-6" @submit.prevent="submit">
        <UFormGroup label="Name" required>
          <UInput v-model="form.name" placeholder="Primary ingest" />
        </UFormGroup>

        <UFormGroup label="Source URL" required>
          <UInput v-model="form.source" placeholder="rtmp://" />
        </UFormGroup>

        <UFormGroup label="Profile" help="Choose the encoding preset." required>
          <USelect v-model="form.profile" :options="profiles" />
        </UFormGroup>

        <UFormGroup label="Auto start">
          <UToggle v-model="form.autoStart" />
        </UFormGroup>

        <div class="flex justify-end gap-2">
          <UButton color="gray" variant="ghost" to="/channels">Cancel</UButton>
          <UButton type="submit" :loading="isSubmitting" icon="i-heroicons-check-circle">
            Save channel
          </UButton>
        </div>
      </form>
    </UCard>
  </UContainer>
</template>

<script setup lang="ts">
const router = useRouter();
const isSubmitting = ref(false);

const form = reactive({
  name: '',
  source: '',
  profile: '1080p',
  autoStart: true,
});

const profiles = [
  { label: '1080p', value: '1080p' },
  { label: '720p', value: '720p' },
  { label: 'Passthrough', value: 'passthrough' },
];

const submit = async () => {
  isSubmitting.value = true;
  try {
    await $fetch('/api/channels', {
      method: 'POST',
      body: form,
    });
    await navigateTo('/channels');
  } finally {
    isSubmitting.value = false;
  }
};
</script>
