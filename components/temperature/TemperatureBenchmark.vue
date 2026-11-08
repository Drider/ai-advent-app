<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import type { TemperatureSummary } from '~/server/utils/benchmark/temperature'
import { getTemperatureTaskSet, type TemperatureTaskSetId } from '~/server/utils/benchmark/temperature'

interface RunInfo {
  runId: string
  model: string
  taskSetId: TemperatureTaskSetId
  createdAt: string
  status: string
  completed: number
  total: number
}

const tab = ref<'current' | 'history'>('current')
const loading = ref(false)
const error = ref('')
const runs = ref<RunInfo[]>([])
const summary = ref<TemperatureSummary | null>(null)
const activeRunId = ref<string | null>(null)
const running = computed(() => summary.value?.status === 'running')
let pollTimer: ReturnType<typeof setInterval> | null = null

async function loadRuns(): Promise<void> {
  runs.value = await $fetch<RunInfo[]>('/api/benchmark/temperature/runs')
}

async function refresh(): Promise<void> {
  if (!activeRunId.value) return
  try {
    summary.value = await $fetch<TemperatureSummary>(`/api/benchmark/temperature/${activeRunId.value}/summary`)
    await loadRuns()
    if (summary.value.status !== 'running') stopPolling()
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause)
    stopPolling()
  }
}

function stopPolling(): void {
  if (pollTimer) clearInterval(pollTimer)
  pollTimer = null
}

function startPolling(): void {
  stopPolling()
  pollTimer = setInterval(() => { void refresh() }, 2000)
}

async function openRun(runId: string): Promise<void> {
  stopPolling()
  activeRunId.value = runId
  summary.value = null
  error.value = ''
  tab.value = 'current'
  await refresh()
  if (running.value) startPolling()
}

async function start(config: { model: string, taskSetId: TemperatureTaskSetId }): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    const result = await $fetch<{ runId: string }>('/api/benchmark/temperature/start', {
      method: 'POST',
      body: config,
    })
    await openRun(result.runId)
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause)
  } finally {
    loading.value = false
  }
}

async function stop(): Promise<void> {
  if (!activeRunId.value) return
  try {
    await $fetch(`/api/benchmark/temperature/${activeRunId.value}/stop`, { method: 'POST' })
    await refresh()
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause)
  }
}

onMounted(() => { void loadRuns().catch(() => { error.value = 'Не удалось загрузить историю прогонов' }) })
onUnmounted(stopPolling)
</script>

<template>
  <div class="space-y-5">
    <UTabs
      v-model="tab"
      :items="[
        { label: 'Новый прогон и результаты', slot: 'current', value: 'current' },
        { label: `История (${runs.length})`, slot: 'history', value: 'history' },
      ]"
    >
      <template #current>
        <div class="mt-4 space-y-5">
          <TemperatureSettings :loading="loading" :running="running" @start="start" />
          <UAlert v-if="error" color="error" :description="error" />
          <div v-if="activeRunId" class="flex flex-wrap items-center gap-3">
            <span class="font-mono text-xs text-muted">{{ activeRunId }}</span>
            <UButton v-if="running" size="sm" color="error" variant="outline" @click="stop">Остановить</UButton>
          </div>
          <TemperatureResults :summary="summary" />
        </div>
      </template>
      <template #history>
        <div class="mt-4 space-y-2">
          <p v-if="runs.length === 0" class="text-sm text-muted">Прогонов пока нет</p>
          <button
            v-for="run in runs"
            :key="run.runId"
            type="button"
            class="flex w-full items-center justify-between gap-3 rounded-lg border border-default p-3 text-left hover:bg-muted/50"
            @click="openRun(run.runId)"
          >
            <span>
              <span class="block text-sm font-medium">{{ run.model }} · {{ getTemperatureTaskSet(run.taskSetId).label }}</span>
              <span class="block text-xs text-muted">{{ new Date(run.createdAt).toLocaleString('ru-RU') }} · {{ run.completed }} / {{ run.total }} · {{ run.runId }}</span>
            </span>
            <UBadge :color="run.status === 'completed' ? 'success' : run.status === 'running' ? 'info' : 'warning'">{{ run.status }}</UBadge>
          </button>
        </div>
      </template>
    </UTabs>
  </div>
</template>
