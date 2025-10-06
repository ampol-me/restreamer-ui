import { defineNuxtConfig } from 'nuxt/config';

export default defineNuxtConfig({
  compatibilityDate: '2024-10-01',
  srcDir: 'app',
  devtools: { enabled: true },
  modules: ['@nuxt/ui'],
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    public: {
      apiBase: '',
    },
  },
  typescript: {
    strict: true,
    typeCheck: true,
  },
});
