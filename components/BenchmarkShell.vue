<script setup lang="ts">
defineProps<{
  title: string
  description?: string
}>()
</script>

<template>
  <div class="mx-auto max-w-7xl space-y-6 p-4">
    <header class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-xl font-semibold">Бенчмарки</h1>
      <div class="flex items-center gap-2">
        <UButton variant="ghost" size="sm" icon="i-lucide-file-text" to="/benchmark/reports">Отчёты</UButton>
        <UButton variant="ghost" size="sm" to="/">← Чат</UButton>
      </div>
    </header>

    <div class="grid gap-6 md:grid-cols-[12rem_minmax(0,1fr)]">
      <BenchmarkNavigation />
      <main class="min-w-0 space-y-6">
        <div>
          <h2 class="text-lg font-semibold">{{ title }}</h2>
          <p v-if="description" class="mt-1 text-sm text-muted">{{ description }}</p>
        </div>
        <slot />
      </main>
    </div>
  </div>
</template>
