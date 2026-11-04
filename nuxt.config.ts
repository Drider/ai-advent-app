// Настройки Nuxt и приватных параметров подключения к модели.
export default defineNuxtConfig({
  srcDir: '.',
  modules: ['@nuxt/ui', '@comark/nuxt'],
  css: ['~/app/assets/css/main.css'],
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  runtimeConfig: {
    llmApiKey: process.env.LLM_API_KEY ?? '',
    llmBaseUrl: process.env.LLM_BASE_URL ?? '',
    llmModel: process.env.LLM_MODEL ?? '',
    llmLogLevel: process.env.LLM_LOG_LEVEL ?? 'basic',
  },
  typescript: {
    strict: true,
    typeCheck: true,
  },
})
