<script setup lang="ts">
interface ReportInfo {
  slug: string
  title: string
  updatedAt: string
  excerpt: string
}

useSeoMeta({ title: 'Отчёты бенчмарков' })

const { data: reports, status } = await useFetch<ReportInfo[]>('/api/benchmark/reports')

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
}
</script>

<template>
  <div class="max-w-5xl mx-auto p-4 space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-semibold">Отчёты бенчмарков</h1>
        <p class="text-sm text-gray-500">Выводы и разборы прогонов — способы промптинга, режимы рассуждения, сравнения моделей</p>
      </div>
      <UButton variant="ghost" size="sm" to="/benchmark">← Бенчмарк</UButton>
    </div>

    <div v-if="status === 'pending'" class="text-sm text-gray-400">
      Загрузка…
    </div>

    <div v-else-if="!reports || reports.length === 0" class="text-sm text-gray-400">
      Отчётов пока нет
    </div>

    <div v-else class="grid gap-4 sm:grid-cols-2">
      <UPageCard
        v-for="report in reports"
        :key="report.slug"
        :to="`/benchmark/reports/${report.slug}`"
        :title="report.title"
        :description="report.excerpt"
        spotlight
        spotlight-color="primary"
      >
        <template #footer>
          <span class="text-xs text-gray-400">{{ formatDate(report.updatedAt) }}</span>
        </template>
      </UPageCard>
    </div>
  </div>
</template>
