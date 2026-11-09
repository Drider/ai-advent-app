<script setup lang="ts">
import { computed } from 'vue'
import { BATTLE_MODELS, type BattleSummary } from '~/server/utils/benchmark/battle'

const props = defineProps<{ summary: BattleSummary | null }>()
const percent = computed(() => props.summary
  ? Math.round(props.summary.progress.completed / props.summary.progress.total * 100)
  : 0)
const needsReview = computed(() => props.summary?.cells.some(cell => cell.verdict === 'unparsed') ?? false)
const comparison = computed(() => {
  const summary = props.summary
  if (!summary || summary.status !== 'completed' || summary.byModel.some(model => model.unparsed > 0)) return null
  const small = summary.byModel.find(model => model.modelId === BATTLE_MODELS[0].id)
  const flagship = summary.byModel.find(model => model.modelId === BATTLE_MODELS[2].id)
  if (!small || !flagship) return null
  return {
    accuracyDelta: Math.round((flagship.correct - small.correct) / small.expected * 100),
    costRatio: small.estimatedCostRub && flagship.estimatedCostRub !== null
      ? flagship.estimatedCostRub / small.estimatedCostRub
      : null,
  }
})

function formatTime(ms: number): string {
  return (ms / 1000).toFixed(1) + ' с'
}

function formatCost(rub: number | null): string {
  return rub === null ? '—' : rub.toFixed(4) + ' ₽'
}
</script>

<template>
  <div v-if="summary" class="space-y-6">
    <section class="space-y-2">
      <div class="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span>{{ summary.config.taskIds.length }} задач · {{ summary.config.repeats }} повторов · рассуждение {{ summary.config.effort }}</span>
        <UBadge :color="summary.status === 'completed' ? 'success' : summary.status === 'running' ? 'info' : 'warning'">
          {{ summary.status }}
        </UBadge>
      </div>
      <div class="flex justify-between text-sm text-muted">
        <span>Прогресс</span>
        <span>{{ summary.progress.completed }} / {{ summary.progress.total }} ({{ percent }}%)</span>
      </div>
      <UProgress :model-value="percent" />
    </section>

    <section class="space-y-2">
      <h2 class="font-semibold">Сравнение моделей</h2>
      <div class="overflow-x-auto">
        <table class="w-full min-w-[48rem] border-collapse text-sm">
          <thead>
            <tr class="bg-muted/50 text-left">
              <th class="border border-default p-2">Модель</th>
              <th class="border border-default p-2">Верные ответы</th>
              <th class="border border-default p-2">Время, медиана / всего</th>
              <th class="border border-default p-2">Токены, вход / выход</th>
              <th class="border border-default p-2">Стоимость</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="model in summary.byModel" :key="model.modelId">
              <td class="border border-default p-2">
                <span class="block font-medium">{{ model.role }} · {{ model.label }}</span>
                <span class="font-mono text-xs text-muted">{{ model.modelId }}</span>
              </td>
              <td class="border border-default p-2">
                {{ model.correct }} / {{ model.expected }} · {{ model.accuracyPercent.toLocaleString('ru-RU') }}%
                <span class="block text-xs text-muted">решено большинством повторов: {{ model.majoritySolvedTasks }} / {{ model.taskCount }} задач</span>
                <span v-if="model.confidence95" class="block text-xs text-muted">95% интервал по задачам: {{ model.confidence95.lower }}–{{ model.confidence95.upper }}%</span>
                <span class="block text-xs text-muted">готово {{ model.completed }} · ошибки {{ model.errors }} · проверить {{ model.unparsed }}</span>
              </td>
              <td class="border border-default p-2">{{ formatTime(model.medianDurationMs) }} / {{ formatTime(model.totalDurationMs) }}</td>
              <td class="border border-default p-2">
                {{ model.inputTokens.toLocaleString('ru-RU') }} / {{ model.outputTokens.toLocaleString('ru-RU') }}
                <span class="block text-xs text-muted">из выхода reasoning: {{ model.reasoningTokens.toLocaleString('ru-RU') }}</span>
              </td>
              <td class="border border-default p-2">{{ formatCost(model.estimatedCostRub) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="text-xs text-muted">Стоимость рассчитана по тарифам, введённым при запуске, и статистике токенов. Кэш и фактическое списание провайдера могут изменить итог.</p>
      <p v-if="comparison" class="text-sm">
        Opus по сравнению с Solar: точность {{ comparison.accuracyDelta >= 0 ? '+' : '' }}{{ comparison.accuracyDelta }} п. п.;
        стоимость {{ comparison.costRatio === null ? 'не удалось сравнить' : '×' + comparison.costRatio.toFixed(1) }}.
      </p>
      <UAlert v-if="needsReview" color="warning" description="Есть ответы, которые автоматическая проверка не смогла однозначно оценить. Они показаны ниже и не засчитаны как верные." />
      <p class="text-xs text-muted">Один повтор на задачу подходит для быстрого сравнения; 30 и более разных задач дают более содержательную среднюю оценку в рамках этого набора.</p>
    </section>

    <BattleCategoryResults :summary="summary" />
    <BattleTaskResults :summary="summary" />
  </div>
</template>
