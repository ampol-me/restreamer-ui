<template>
  <UContainer class="py-10 space-y-8">
    <div>
      <h1 class="text-3xl font-semibold tracking-tight">Help & Resources</h1>
      <p class="text-muted">Guides for operators and troubleshooting steps.</p>
    </div>

    <UCard>
      <template #header>
        <h2 class="text-lg font-semibold">Quick answers</h2>
      </template>
      <UAccordion :items="items" />
    </UCard>
  </UContainer>
</template>

<script setup lang="ts">
const items = [
  {
    label: 'Why is my stream offline?',
    icon: 'i-heroicons-question-mark-circle',
    content:
      'Check channel ingest credentials, ensure the encoder is connected, and verify publications are enabled.',
  },
  {
    label: 'How do I rotate API keys?',
    icon: 'i-heroicons-arrow-path',
    content:
      'Navigate to Settings > Authentication and generate a new key. Update your encoders immediately after.',
  },
  {
    label: 'Where are logs stored?',
    icon: 'i-heroicons-document-text',
    content:
      'System logs are exposed via the /api/logs endpoint and forwarded to the configured syslog target.',
  },
];
</script>
