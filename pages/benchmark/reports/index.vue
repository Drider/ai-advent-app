<script setup lang="ts">
import { benchmarkLabel, type BenchmarkId } from '~/shared/benchmarks'

interface ReportInfo {
  slug: string
  title: string
  updatedAt: string
  excerpt: string
  benchmarkId: BenchmarkId
}

useSeoMeta({ title: 'Отчёты бенчмарков' })

const { data: reports, status } = await useFetch<ReportInfo[]>('/api/benchmark/reports')

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
}
</script>

<template>
  <div class="max-w-5xl mx-auto p-4 space-y-6">
    <div>
      <h1 class="text-xl font-semibold">Отчёты бенчмарков</h1>
      <p class="text-sm text-gray-500">Выводы и разборы прогонов — способы промптинга, режимы рассуждения, сравнения моделей</p>
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
          <div class="flex w-full flex-wrap items-center justify-between gap-2">
            <UBadge color="primary" variant="subtle" size="sm">{{ benchmarkLabel(report.benchmarkId) }}</UBadge>
            <span class="text-xs text-gray-400">{{ formatDate(report.updatedAt) }}</span>
          </div>
        </template>
      </UPageCard>
    </div>
  </div>
</template>
