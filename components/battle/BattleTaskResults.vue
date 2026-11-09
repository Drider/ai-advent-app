<script setup lang="ts">
import { computed } from 'vue'
import { BATTLE_MODELS, type BattleCell, type BattleSummary } from '~/server/utils/benchmark/battle'
import { BATTLE_TASKS } from '~/server/utils/benchmark/battle-tasks'

const props = defineProps<{ summary: BattleSummary }>()
const selectedTasks = computed(() => BATTLE_TASKS.filter(task => props.summary.config.taskIds.includes(task.id)))

function taskScore(taskId: string, modelId: string): string {
  const cells = props.summary.cells.filter(cell => cell.taskId === taskId && cell.modelId === modelId)
  return cells.filter(cell => cell.verdict === 'correct').length + ' / ' + props.summary.config.repeats
}

function taskCells(taskId: string): BattleCell[] {
  return props.summary.cells.filter(cell => cell.taskId === taskId)
    .sort((a, b) => a.repeat - b.repeat || BATTLE_MODELS.findIndex(model => model.id === a.modelId) - BATTLE_MODELS.findIndex(model => model.id === b.modelId))
}

function modelLabel(modelId: string): string {
  return BATTLE_MODELS.find(model => model.id === modelId)?.label ?? modelId
}

function verdictLabel(cell: BattleCell): string {
  if (cell.status === 'error') return 'Ошибка запроса'
  if (cell.status === 'truncated') return 'Ответ оборвался'
  if (cell.status === 'empty') return 'Пустой ответ'
  if (cell.verdict === 'correct') return 'Верно'
  if (cell.verdict === 'incorrect') return 'Неверно'
  return 'Нужна проверка'
}

function formatTime(ms: number): string {
  return (ms / 1000).toFixed(1) + ' с'
}
</script>

<template>
  <section class="space-y-2">
    <h2 class="font-semibold">Результаты по задачам</h2>
    <div class="overflow-x-auto">
      <table class="w-full min-w-[34rem] border-collapse text-sm">
        <thead>
          <tr class="bg-muted/50 text-left">
            <th class="border border-default p-2">Задача</th>
            <th v-for="model in summary.byModel" :key="model.modelId" class="border border-default p-2">{{ model.label }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="task in selectedTasks" :key="task.id">
            <td class="border border-default p-2">{{ task.title }}</td>
            <td v-for="model in summary.byModel" :key="model.modelId" class="border border-default p-2">{{ taskScore(task.id, model.modelId) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>

  <section class="space-y-3">
    <h2 class="font-semibold">Ответы и детали запросов</h2>
    <div v-for="task in selectedTasks" :key="task.id" class="space-y-2">
      <h3 class="text-sm font-medium">{{ task.title }}</h3>
      <p class="whitespace-pre-line text-xs text-muted">{{ task.question }}</p>
      <details
        v-for="cell in taskCells(task.id)"
        :key="cell.modelId + '-' + cell.taskId + '-' + cell.repeat"
        class="rounded-lg border border-default"
      >
        <summary class="cursor-pointer p-3 text-sm">
          <span class="font-medium">{{ modelLabel(cell.modelId) }}</span>
          · повтор {{ cell.repeat }} · {{ verdictLabel(cell) }} · {{ formatTime(cell.durationMs) }}
        </summary>
        <div class="space-y-2 border-t border-default p-3 text-sm">
          <p class="text-xs text-muted">Эталон: {{ task.answerKey }}</p>
          <pre class="whitespace-pre-wrap break-words font-sans">{{ cell.answer || cell.error || 'Пустой ответ' }}</pre>
          <p class="text-xs text-muted">
            Токены: {{ cell.inputTokens ?? '—' }} вход / {{ cell.outputTokens ?? '—' }} выход
            · reasoning {{ cell.reasoningTokens ?? '—' }}
            · cache read {{ cell.cacheReadTokens ?? '—' }}
            · finish {{ cell.finishReason }}
          </p>
        </div>
      </details>
    </div>
  </section>
</template>
