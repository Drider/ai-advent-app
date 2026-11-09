<script setup lang="ts">
import { BATTLE_MODELS, type BattleSummary } from '~/server/utils/benchmark/battle'

defineProps<{ summary: BattleSummary }>()

function formatPercent(value: number): string {
  return value.toLocaleString('ru-RU', { maximumFractionDigits: 1 }) + '%'
}
</script>

<template>
  <section class="space-y-2">
    <h2 class="font-semibold">Результаты по категориям</h2>
    <div class="overflow-x-auto">
      <table class="w-full min-w-[48rem] border-collapse text-sm">
        <thead>
          <tr class="bg-muted/50 text-left">
            <th class="border border-default p-2">Категория</th>
            <th v-for="model in BATTLE_MODELS" :key="model.id" class="border border-default p-2">{{ model.label }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="category in summary.byCategory" :key="category.categoryId">
            <th class="border border-default p-2 text-left font-medium">{{ category.label }}</th>
            <td v-for="model in category.byModel" :key="model.modelId" class="border border-default p-2">
              <span class="block">{{ model.correct }} / {{ model.expected }} · {{ formatPercent(model.accuracyPercent) }}</span>
              <span class="block text-xs text-muted">Большинство повторов: {{ model.majoritySolvedTasks }} / {{ model.taskCount }} задач</span>
              <span v-if="model.confidence95" class="block text-xs text-muted">95% интервал по задачам: {{ formatPercent(model.confidence95.lower) }}–{{ formatPercent(model.confidence95.upper) }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="text-xs text-muted">Интервал Уилсона рассчитан по уникальным задачам; задача считается решённой, если верны больше половины её повторов. Для незавершённого прогона интервал не показывается.</p>
  </section>
</template>
