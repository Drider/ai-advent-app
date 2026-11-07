<script setup lang="ts">
import { ref, computed } from 'vue'
import { BENCHMARK_TASKS } from '~/server/utils/benchmark/tasks'

const ALL_EFFORTS = ['none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'] as const
const ALL_METHODS = ['direct', 'step_by_step', 'self_prompt', 'experts'] as const
const ALL_TASK_IDS = BENCHMARK_TASKS.map(t => t.id)

const props = defineProps<{
  loading: boolean
}>()

const emit = defineEmits<{
  start: [config: {
    model: string
    efforts: string[]
    taskIds: string[]
    methods: string[]
    repeats: number
    concurrency: number
    judgeModel: string
    resume: boolean
    runId?: string
  }]
}>()

const model = ref('upstage/solar-mini4')
const judgeModel = ref('upstage/solar-mini4')
const selectedEfforts = ref<string[]>(['none', 'max'])
const selectedTaskIds = ref<string[]>([...ALL_TASK_IDS])
const selectedMethods = ref<string[]>([...ALL_METHODS])
const repeats = ref(5)
const concurrency = ref(5)
const resumeRunId = ref('')

const canStart = computed(() =>
  model.value.trim()
  && selectedEfforts.value.length > 0
  && selectedTaskIds.value.length > 0
  && selectedMethods.value.length > 0
  && repeats.value >= 1,
)

function toggle<T>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter(x => x !== value) : [...arr, value]
}

function handleStart(): void {
  emit('start', {
    model: model.value.trim(),
    efforts: selectedEfforts.value,
    taskIds: selectedTaskIds.value,
    methods: selectedMethods.value,
    repeats: repeats.value,
    concurrency: concurrency.value,
    judgeModel: judgeModel.value.trim() || model.value.trim(),
    resume: !!resumeRunId.value.trim(),
    runId: resumeRunId.value.trim() || undefined,
  })
}
</script>

<template>
  <div class="space-y-4">
    <div class="grid grid-cols-2 gap-4">
      <UFormField label="Модель">
        <UInput v-model="model" placeholder="model/name" class="font-mono text-sm" />
      </UFormField>
      <UFormField label="Модель-судья">
        <UInput v-model="judgeModel" placeholder="model/name (по умолчанию — та же)" class="font-mono text-sm" />
      </UFormField>
    </div>

    <UFormField label="Уровни рассуждения">
      <div class="flex flex-wrap gap-2">
        <UButton
          v-for="effort in ALL_EFFORTS"
          :key="effort"
          size="sm"
          :variant="selectedEfforts.includes(effort) ? 'solid' : 'outline'"
          @click="selectedEfforts = toggle(selectedEfforts, effort)"
        >
          {{ effort }}
        </UButton>
      </div>
    </UFormField>

    <UFormField label="Способы промптинга">
      <div class="flex flex-wrap gap-2">
        <UButton
          v-for="method in ALL_METHODS"
          :key="method"
          size="sm"
          :variant="selectedMethods.includes(method) ? 'solid' : 'outline'"
          @click="selectedMethods = toggle(selectedMethods, method)"
        >
          {{ method }}
        </UButton>
      </div>
    </UFormField>

    <UFormField label="Задачи">
      <div class="flex flex-wrap gap-2">
        <UButton
          v-for="task in BENCHMARK_TASKS"
          :key="task.id"
          size="sm"
          :variant="selectedTaskIds.includes(task.id) ? 'solid' : 'outline'"
          @click="selectedTaskIds = toggle(selectedTaskIds, task.id)"
        >
          {{ task.id }}
        </UButton>
      </div>
    </UFormField>

    <div class="grid grid-cols-2 gap-4">
      <UFormField label="Повторы">
        <UInput v-model.number="repeats" type="number" :min="1" :max="20" />
      </UFormField>
      <UFormField label="Параллельность">
        <UInput v-model.number="concurrency" type="number" :min="1" :max="10" />
      </UFormField>
    </div>

    <UFormField label="Продолжить прогон (runId)">
      <UInput v-model="resumeRunId" placeholder="2026-11-07T..." class="font-mono text-sm" />
    </UFormField>

    <UButton
      :disabled="!canStart || loading"
      :loading="loading"
      @click="handleStart"
    >
      {{ resumeRunId ? 'Продолжить' : 'Запустить' }}
    </UButton>
  </div>
</template>
