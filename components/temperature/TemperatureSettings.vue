<script setup lang="ts">
import { computed, ref } from 'vue'
import { getTemperatureTaskSet, TEMPERATURE_REPEATS, TEMPERATURES, TEMPERATURE_TASK_SETS, type TemperatureTaskSetId } from '~/server/utils/benchmark/temperature'

defineProps<{ loading: boolean, running: boolean }>()
const emit = defineEmits<{ start: [config: { model: string, taskSetId: TemperatureTaskSetId }] }>()

const selectedModel = ref('upstage/solar-mini4')
const customModel = ref('')
const selectedTaskSet = ref<TemperatureTaskSetId>('interesting')
const modelOptions = [
  { label: 'Upstage Solar Mini 4', value: 'upstage/solar-mini4' },
  { label: 'DeepSeek V4.1 Flash', value: 'deepseek/deepseek-v4.1-flash' },
  { label: 'Другая модель…', value: 'custom' },
]
const taskSetOptions = Object.entries(TEMPERATURE_TASK_SETS).map(([value, taskSet]) => ({
  label: taskSet.label,
  value: value as TemperatureTaskSetId,
}))
const model = computed(() => selectedModel.value === 'custom' ? customModel.value.trim() : selectedModel.value)
const tasks = computed(() => getTemperatureTaskSet(selectedTaskSet.value).tasks)
const canStart = computed(() => !!model.value && !/\s/.test(model.value) && model.value.length <= 200)
</script>

<template>
  <div class="space-y-4 rounded-lg border border-default p-4">
    <div>
      <h3 class="font-semibold">Новый прогон</h3>
      <p class="mt-1 text-sm text-muted">{{ tasks.length }} задачи × {{ TEMPERATURES.length }} температуры × {{ TEMPERATURE_REPEATS }} повторов = 30 запросов к модели.</p>
    </div>

    <div class="grid gap-3 sm:grid-cols-2">
      <UFormField label="Модель">
        <USelect v-model="selectedModel" :items="modelOptions" class="w-full" />
      </UFormField>
      <UFormField label="Набор вопросов">
        <USelect v-model="selectedTaskSet" :items="taskSetOptions" class="w-full" />
      </UFormField>
    </div>
    <UFormField v-if="selectedModel === 'custom'" label="ID модели">
      <UInput v-model="customModel" placeholder="provider/model" class="w-full font-mono" />
    </UFormField>

    <div class="space-y-2 text-sm">
      <p><strong>Один правильный ответ:</strong> {{ tasks[0]?.prompt }}</p>
      <p><strong>Генерация:</strong> {{ tasks[1]?.prompt }}</p>
    </div>

    <p class="text-xs text-muted">Режим размышлений для всех запросов: none. После запуска ответы и параметры каждого вызова сохраняются.</p>
    <UButton :disabled="!canStart || loading || running" :loading="loading" @click="emit('start', { model, taskSetId: selectedTaskSet })">
      Запустить 30 прогонов
    </UButton>
  </div>
</template>
