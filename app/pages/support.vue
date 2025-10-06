<template>
  <UContainer class="py-10 space-y-8">
    <div>
      <h1 class="text-3xl font-semibold tracking-tight">Support</h1>
      <p class="text-muted">Get help from the Restreamer team.</p>
    </div>

    <UCard>
      <template #header>
        <h2 class="text-lg font-semibold">Contact options</h2>
      </template>
      <ul class="space-y-4 text-sm">
        <li class="flex items-center gap-3">
          <UIcon name="i-heroicons-envelope" class="text-primary" />
          <span>Email: <a class="text-primary hover:underline" href="mailto:support@example.com">support@example.com</a></span>
        </li>
        <li class="flex items-center gap-3">
          <UIcon name="i-heroicons-chat-bubble-left-right" class="text-primary" />
          <span>Community chat: <a class="text-primary hover:underline" href="https://community.restreamer.local">community.restreamer.local</a></span>
        </li>
        <li class="flex items-center gap-3">
          <UIcon name="i-heroicons-book-open" class="text-primary" />
          <span>Docs: <NuxtLink class="text-primary hover:underline" to="/help">Help Center</NuxtLink></span>
        </li>
      </ul>
    </UCard>
  </UContainer>
</template>
