<script setup lang="ts">
import { computed } from 'vue'
import { getTemperatureTaskSet, type TemperatureCell, type TemperatureSummary } from '~/server/utils/benchmark/temperature'

const { summary } = defineProps<{ summary: TemperatureSummary | null }>()

const percent = computed(() => {
  if (!summary) return 0
  return Math.round(summary.progress.completed / summary.progress.total * 100)
})

const reasoningDetected = computed(() => summary?.cells.some(cell => (cell.reasoningTokens ?? 0) > 0) ?? false)

function groupCells(taskId: string, temperature: number): TemperatureCell[] {
  return summary?.cells
    .filter(cell => cell.taskId === taskId && cell.temperature === temperature)
    .sort((a, b) => a.repeat - b.repeat) ?? []
}
</script>

<template>
  <div v-if="summary" class="space-y-6">
    <div class="space-y-2">
      <div class="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span>Модель: <strong class="font-mono">{{ summary.config.model }}</strong> · {{ getTemperatureTaskSet(summary.config.taskSetId).label }}</span>
        <UBadge :color="summary.status === 'completed' ? 'success' : summary.status === 'running' ? 'info' : 'warning'">
          {{ summary.status }}
        </UBadge>
      </div>
      <div class="flex justify-between text-sm text-muted">
        <span>Прогресс</span>
        <span>{{ summary.progress.completed }} / {{ summary.progress.total }} ({{ percent }}%)</span>
      </div>
      <UProgress :model-value="percent" />
      <UAlert
        v-if="reasoningDetected"
        color="warning"
        description="У некоторых ответов есть reasoning-токены. Проверьте, что провайдер действительно применил режим none, прежде чем сравнивать влияние температуры."
      />
    </div>

    <section>
      <h3 class="mb-2 font-semibold">Сводка</h3>
      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr class="bg-muted/50 text-left">
              <th class="border border-default p-2">Задача</th>
              <th class="border border-default p-2">Temperature</th>
              <th class="border border-default p-2">Готово</th>
              <th class="border border-default p-2">Верно</th>
              <th class="border border-default p-2">Разных ответов</th>
              <th class="border border-default p-2">Ошибки</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="group in summary.groups" :key="`${group.taskId}-${group.temperature}`">
              <td class="border border-default p-2">{{ group.title }}</td>
              <td class="border border-default p-2 font-mono">{{ group.temperature }}</td>
              <td class="border border-default p-2">{{ group.completed }} / {{ group.expected }}</td>
              <td class="border border-default p-2">{{ group.correct === null ? '—' : `${group.correct} / ${group.completed}` }}</td>
              <td class="border border-default p-2">{{ group.uniqueAnswers }}</td>
              <td class="border border-default p-2">{{ group.errors }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="space-y-4">
      <h3 class="font-semibold">Ответы всех прогонов</h3>
      <div v-for="group in summary.groups" :key="`${group.taskId}-${group.temperature}`" class="space-y-2">
        <h4 class="text-sm font-medium">{{ group.title }} · temperature {{ group.temperature }}</h4>
        <details
          v-for="cell in groupCells(group.taskId, group.temperature)"
          :key="`${cell.taskId}-${cell.temperature}-${cell.repeat}`"
          class="rounded-lg border border-default"
        >
          <summary class="cursor-pointer p-3 text-sm">
            <span class="block font-medium">Запрос: {{ cell.prompt }}</span>
            <span class="mt-1 block text-xs text-muted">Повтор {{ cell.repeat }} · temperature {{ cell.temperature }} · {{ cell.status }} · {{ (cell.durationMs / 1000).toFixed(1) }} с</span>
          </summary>
          <div class="border-t border-default p-3 text-sm">
            <p class="mb-2 font-medium">Ответ модели</p>
            <pre class="whitespace-pre-wrap break-words font-sans">{{ cell.answer || (cell.error ? `Ошибка: ${cell.error}` : 'Пустой ответ') }}</pre>
            <p class="mt-3 text-xs text-muted">
              {{ cell.correct === null ? 'Творческий ответ' : cell.correct ? 'Верно' : 'Неверно' }}
              · токены: {{ cell.inputTokens ?? '—' }} вход / {{ cell.outputTokens ?? '—' }} выход
              · reasoning: {{ cell.reasoningTokens ?? '—' }}
              · finish: {{ cell.finishReason }}
            </p>
          </div>
        </details>
      </div>
    </section>
  </div>
</template>
