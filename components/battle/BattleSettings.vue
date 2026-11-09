<script setup lang="ts">
import { computed, reactive, ref, shallowRef } from 'vue'
import { BATTLE_MODELS, type BattleConfig, type BattleEffort } from '~/server/utils/benchmark/battle'
import { BATTLE_CATEGORIES, BATTLE_TASKS } from '~/server/utils/benchmark/battle-tasks'

defineProps<{ loading: boolean, running: boolean }>()
const emit = defineEmits<{ start: [config: BattleConfig] }>()

const models = reactive(BATTLE_MODELS.map(model => ({
  id: model.id,
  inputPerMillion: model.inputPerMillion as number,
  outputPerMillion: model.outputPerMillion as number,
})))
const taskIds = ref(BATTLE_TASKS.map(task => task.id))
const repeats = shallowRef(1)
const effort = shallowRef<BattleEffort>('medium')
const maxOutputTokens = shallowRef(8192)
const requestsPerMinute = shallowRef(0)
const effortOptions = [
  { label: 'Низкий', value: 'low' },
  { label: 'Средний', value: 'medium' },
  { label: 'Высокий', value: 'high' },
]

const requestCount = computed(() => taskIds.value.length * repeats.value * models.length)
const taskGroups = computed(() => BATTLE_CATEGORIES.map(category => ({
  ...category,
  tasks: BATTLE_TASKS.filter(task => task.categoryId === category.id),
  selectedCount: BATTLE_TASKS.filter(task => task.categoryId === category.id && taskIds.value.includes(task.id)).length,
})))
const requestNoun = computed(() => {
  const value = requestCount.value
  if (value % 100 >= 11 && value % 100 <= 14) return 'запросов'
  if (value % 10 === 1) return 'запрос'
  if (value % 10 >= 2 && value % 10 <= 4) return 'запроса'
  return 'запросов'
})
const canStart = computed(() =>
  taskIds.value.length >= 5
  && Number.isInteger(repeats.value) && repeats.value >= 1 && repeats.value <= 5
  && Number.isInteger(maxOutputTokens.value) && maxOutputTokens.value >= 1024 && maxOutputTokens.value <= 32768
  && Number.isSafeInteger(requestsPerMinute.value) && requestsPerMinute.value >= 0
  && models.every(model =>
    Number.isFinite(model.inputPerMillion) && model.inputPerMillion >= 0
    && Number.isFinite(model.outputPerMillion) && model.outputPerMillion >= 0,
  ),
)

function toggleTask(id: string): void {
  taskIds.value = taskIds.value.includes(id)
    ? taskIds.value.filter(taskId => taskId !== id)
    : [...taskIds.value, id]
}

function toggleCategory(categoryId: (typeof BATTLE_CATEGORIES)[number]['id']): void {
  const categoryTaskIds = BATTLE_TASKS.filter(task => task.categoryId === categoryId).map(task => task.id)
  const allSelected = categoryTaskIds.every(id => taskIds.value.includes(id))
  taskIds.value = allSelected
    ? taskIds.value.filter(id => !categoryTaskIds.includes(id))
    : [...new Set([...taskIds.value, ...categoryTaskIds])]
}

function selectAllTasks(): void {
  taskIds.value = BATTLE_TASKS.map(task => task.id)
}

function start(): void {
  if (!canStart.value) return
  emit('start', {
    models: models.map(model => ({ ...model })),
    taskIds: [...taskIds.value],
    repeats: repeats.value,
    effort: effort.value,
    maxOutputTokens: maxOutputTokens.value,
    requestsPerMinute: requestsPerMinute.value,
  })
}
</script>

<template>
  <section class="space-y-5 rounded-lg border border-default p-4">
    <div>
      <h2 class="font-semibold">Новый прогон</h2>
      <p class="mt-1 text-sm text-muted">Три модели решают одинаковые задачи с одним промптом. Запросы идут по очереди, порядок моделей чередуется.</p>
    </div>

    <div class="space-y-2">
      <h3 class="text-sm font-medium">Модели и тарифы Polza, ₽ за 1 млн токенов</h3>
      <div class="overflow-x-auto">
        <table class="w-full min-w-[35rem] border-collapse text-sm">
          <thead>
            <tr class="bg-muted/50 text-left">
              <th class="border border-default p-2">Роль и модель</th>
              <th class="border border-default p-2">Вход</th>
              <th class="border border-default p-2">Выход</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(model, index) in models" :key="model.id">
              <td class="border border-default p-2">
                <span class="block font-medium">{{ BATTLE_MODELS[index]?.role }} · {{ BATTLE_MODELS[index]?.label }}</span>
                <span class="font-mono text-xs text-muted">{{ model.id }}</span>
              </td>
              <td class="border border-default p-2">
                <UInput v-model.number="model.inputPerMillion" type="number" :min="0" step="0.01" :aria-label="'Цена входа ' + model.id" class="w-28" />
              </td>
              <td class="border border-default p-2">
                <UInput v-model.number="model.outputPerMillion" type="number" :min="0" step="0.01" :aria-label="'Цена выхода ' + model.id" class="w-28" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="text-xs text-muted">Предзаполнены тарифы на 8 ноября 2026 года. Перед запуском их можно обновить; сумма в результатах будет расчётной.</p>
    </div>

    <div class="space-y-2">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h3 class="text-sm font-medium">Задачи · {{ taskIds.length }} из {{ BATTLE_TASKS.length }}</h3>
        <UButton size="xs" variant="outline" @click="selectAllTasks">Выбрать все</UButton>
      </div>
      <p class="text-xs text-muted">В каталоге {{ BATTLE_TASKS.length }} задач в шести категориях. Для средней оценки выберите хотя бы 30 разных задач и включите все категории; повторы полезны для оценки устойчивости ответа.</p>
      <div class="space-y-4">
        <section v-for="group in taskGroups" :key="group.id" class="space-y-2">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h4 class="text-sm font-medium">{{ group.label }} <span class="text-xs font-normal text-muted">{{ group.selectedCount }}/{{ group.tasks.length }}</span></h4>
            <UButton size="xs" variant="ghost" @click="toggleCategory(group.id)">
              {{ group.selectedCount === group.tasks.length ? 'Снять выбор' : 'Выбрать категорию' }}
            </UButton>
          </div>
          <div class="flex flex-wrap gap-2">
            <UButton
              v-for="task in group.tasks"
              :key="task.id"
              size="xs"
              :variant="taskIds.includes(task.id) ? 'solid' : 'outline'"
              :aria-pressed="taskIds.includes(task.id)"
              @click="toggleTask(task.id)"
            >
              {{ task.title }}
            </UButton>
          </div>
        </section>
      </div>
      <p v-if="taskIds.length < 5" class="text-xs text-error">Для задания нужно выбрать не меньше пяти задач.</p>
    </div>

    <div class="grid gap-3 sm:grid-cols-4">
      <UFormField label="Повторов на задачу">
        <UInput v-model.number="repeats" type="number" :min="1" :max="5" class="w-full" />
      </UFormField>
      <UFormField label="Уровень рассуждения">
        <USelect v-model="effort" :items="effortOptions" class="w-full" />
      </UFormField>
      <UFormField label="Лимит токенов ответа">
        <UInput v-model.number="maxOutputTokens" type="number" :min="1024" :max="32768" step="1024" class="w-full" />
      </UFormField>
      <UFormField label="Запросов в минуту на модель">
        <UInput v-model.number="requestsPerMinute" type="number" :min="0" class="w-full" />
      </UFormField>
    </div>
    <p class="text-xs text-muted">У Polza лимит зависит от модели и организации. Укажите предел запросов в минуту для каждой модели в этом прогоне или оставьте 0 без ручного ограничения. Время одного ответа измеряется отдельно от ожидания очереди.</p>

    <UButton :disabled="!canStart || loading || running" :loading="loading" @click="start">
      Запустить {{ requestCount }} {{ requestNoun }}
    </UButton>
  </section>
</template>
