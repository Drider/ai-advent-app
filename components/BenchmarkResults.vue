<script setup lang="ts">
import { computed } from 'vue'
import type { RunSummary } from '~/server/utils/benchmark/aggregate'

const props = defineProps<{
  summary: RunSummary | null
  progress: { completed: number, total: number } | null
}>()

const percent = computed(() => {
  if (!props.progress || props.progress.total === 0) return 0
  return Math.round((props.progress.completed / props.progress.total) * 100)
})

const verdictLabel: Record<string, string> = {
  correct: '✓',
  incorrect: '✗',
  unparsed: '?',
  error: 'err',
  pending: '…',
}

const methodColumns = [
  { key: 'method', label: 'Способ' },
  { key: 'effort', label: 'Effort' },
  { key: 'correct', label: 'Верных' },
  { key: 'totalCells', label: 'Всего' },
  { key: 'unparsed', label: 'Неразобр.' },
  { key: 'truncated', label: 'Truncated' },
  { key: 'error', label: 'Ошибок' },
  { key: 'medianDurationMs', label: 'Медиана, с' },
  { key: 'p90DurationMs', label: 'P90, с' },
  { key: 'totalReasoningTokens', label: 'Reasoning tok' },
  { key: 'totalOutputTokens', label: 'Output tok' },
  { key: 'apiCallCount', label: 'API вызовов' },
]

const methodRows = computed(() =>
  (props.summary?.byMethodEffort ?? []).map(row => ({
    ...row,
    medianDurationMs: (row.medianDurationMs / 1000).toFixed(1),
    p90DurationMs: (row.p90DurationMs / 1000).toFixed(1),
  })),
)

const taskIds = computed(() =>
  [...new Set((props.summary?.cells ?? []).map(c => c.taskId))].sort(),
)

const efforts = computed(() =>
  [...new Set((props.summary?.cells ?? []).map(c => c.effort))].sort(),
)

const methods = computed(() =>
  [...new Set((props.summary?.cells ?? []).map(c => c.method))].sort(),
)

function getVerdict(taskId: string, method: string, effort: string, repeat: number): string {
  const cell = props.summary?.cells.find(
    c => c.taskId === taskId && c.method === method && c.effort === effort && c.repeat === repeat,
  )
  if (!cell) return '·'
  return verdictLabel[cell.verdict] ?? cell.verdict
}

const repeats = computed(() => {
  const max = Math.max(0, ...(props.summary?.cells ?? []).map(c => c.repeat))
  return Array.from({ length: max }, (_, i) => i + 1)
})
</script>

<template>
  <div class="space-y-6">
    <!-- Progress -->
    <div v-if="progress" class="space-y-1">
      <div class="flex justify-between text-sm text-gray-500">
        <span>Прогресс</span>
        <span>{{ progress.completed }} / {{ progress.total }} ({{ percent }}%)</span>
      </div>
      <UProgress :model-value="percent" />
    </div>

    <!-- Summary table -->
    <div v-if="summary && summary.byMethodEffort.length > 0">
      <h3 class="text-sm font-semibold mb-2">Сводная таблица способ × режим</h3>
      <div class="overflow-x-auto">
        <table class="text-xs border-collapse w-full">
          <thead>
            <tr>
              <th v-for="col in methodColumns" :key="col.key" class="border border-gray-200 px-2 py-1 bg-gray-50 text-left whitespace-nowrap">
                {{ col.label }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in methodRows" :key="row.method + row.effort">
              <td v-for="col in methodColumns" :key="col.key" class="border border-gray-200 px-2 py-1 whitespace-nowrap">
                {{ (row as Record<string, unknown>)[col.key] }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Per-task breakdown -->
    <div v-if="summary && taskIds.length > 0 && efforts.length > 0">
      <h3 class="text-sm font-semibold mb-2">Разбивка по задачам</h3>
      <div v-for="effort in efforts" :key="effort" class="mb-4">
        <p class="text-xs text-gray-500 mb-1">effort = {{ effort }}</p>
        <div class="overflow-x-auto">
          <table class="text-xs border-collapse w-full">
            <thead>
              <tr>
                <th class="border border-gray-200 px-2 py-1 bg-gray-50">Задача / способ</th>
                <th
                  v-for="method in methods"
                  :key="method"
                  class="border border-gray-200 px-2 py-1 bg-gray-50"
                >
                  {{ method }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="taskId in taskIds" :key="taskId">
                <td class="border border-gray-200 px-2 py-1 font-mono">{{ taskId }}</td>
                <td
                  v-for="method in methods"
                  :key="method"
                  class="border border-gray-200 px-2 py-1 text-center"
                >
                  <span
                    v-for="repeat in repeats"
                    :key="repeat"
                    :class="{
                      'text-green-600': getVerdict(taskId, method, effort, repeat) === '✓',
                      'text-red-500': getVerdict(taskId, method, effort, repeat) === '✗',
                      'text-yellow-500': getVerdict(taskId, method, effort, repeat) === '?',
                      'text-gray-400': ['·', '…', 'err'].includes(getVerdict(taskId, method, effort, repeat)),
                    }"
                  >{{ getVerdict(taskId, method, effort, repeat) }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
