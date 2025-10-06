<template>
  <UContainer class="py-10 space-y-8">
    <div>
      <h1 class="text-3xl font-semibold tracking-tight">Settings</h1>
      <p class="text-muted">Configure authentication, defaults, and integrations.</p>
    </div>

    <UCard>
      <template #header>
        <h2 class="text-lg font-semibold">General</h2>
      </template>
      <form class="space-y-6" @submit.prevent>
        <UFormGroup label="Display name" help="Shown in the header and dashboards." required>
          <UInput placeholder="Restreamer" />
        </UFormGroup>
        <UFormGroup label="API endpoint" help="Override auto-detected backend URL.">
          <UInput placeholder="https://restreamer.local" />
        </UFormGroup>
        <UButton type="submit" icon="i-heroicons-device-phone-mobile">Save changes</UButton>
      </form>
    </UCard>

    <UCard>
      <template #header>
        <h2 class="text-lg font-semibold">Authentication</h2>
      </template>
      <div class="space-y-4">
        <p class="text-sm text-muted">Manage Auth0 or local access policies.</p>
        <UButton color="gray" variant="soft" icon="i-heroicons-key">
          Configure providers
        </UButton>
      </div>
    </UCard>
  </UContainer>
</template>
