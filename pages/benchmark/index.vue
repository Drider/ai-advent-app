<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import type { RunSummary } from '~/server/utils/benchmark/aggregate'

useSeoMeta({ title: 'Бенчмарк' })

interface RunInfo {
  runId: string
  status: string
  model: string
  createdAt: string
  cellCount: number
}

const loading = ref(false)
const error = ref('')
const activeRunId = ref<string | null>(null)
const progress = ref<{ completed: number, total: number } | null>(null)
const summary = ref<RunSummary | null>(null)
const runs = ref<RunInfo[]>([])
const tab = ref<'new' | 'runs'>('new')

let eventSource: EventSource | null = null
let summaryInterval: ReturnType<typeof setInterval> | null = null

async function loadRuns(): Promise<void> {
  try {
    runs.value = await $fetch<RunInfo[]>('/api/benchmark/runs')
  } catch (e) {
    console.error('Failed to load runs', e)
  }
}

loadRuns()

async function handleStart(config: Record<string, unknown>): Promise<void> {
  error.value = ''
  loading.value = true
  summary.value = null
  progress.value = null
  stopListening()

  try {
    const { runId } = await $fetch<{ runId: string }>('/api/benchmark/start', {
      method: 'POST',
      body: config,
    })
    activeRunId.value = runId
    tab.value = 'new'
    listenToRun(runId)
    await loadRuns()
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

function listenToRun(runId: string): void {
  stopListening()
  activeRunId.value = runId
  progress.value = null

  eventSource = new EventSource(`/api/benchmark/${runId}/events`)

  eventSource.addEventListener('message', (e) => {
    try {
      const { kind, payload } = JSON.parse(e.data) as { kind: string, payload: unknown }
      if (kind === 'progress') {
        progress.value = payload as { completed: number, total: number }
      }
      if (kind === 'done' || kind === 'error') {
        stopListening()
        fetchSummary(runId)
      }
      if (kind === 'cell' || kind === 'grade') {
        // throttled refresh via interval below
      }
    } catch { /* ignore parse errors */ }
  })

  eventSource.onerror = () => {
    stopListening()
  }

  // Poll summary every 10 s while running
  summaryInterval = setInterval(() => fetchSummary(runId), 10_000)
  fetchSummary(runId)
}

async function fetchSummary(runId: string): Promise<void> {
  try {
    summary.value = await $fetch<RunSummary>(`/api/benchmark/${runId}/summary`)
  } catch { /* ignore */ }
}

async function stopRun(): Promise<void> {
  if (!activeRunId.value) return
  await $fetch(`/api/benchmark/${activeRunId.value}/stop`, { method: 'POST' }).catch(() => {})
  stopListening()
}

function stopListening(): void {
  eventSource?.close()
  eventSource = null
  if (summaryInterval) clearInterval(summaryInterval)
  summaryInterval = null
}

function openRun(runId: string): void {
  listenToRun(runId)
  tab.value = 'new'
  fetchSummary(runId)
}

onUnmounted(stopListening)
</script>

<template>
  <div class="max-w-5xl mx-auto p-4 space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-semibold">Бенчмарк</h1>
      <div class="flex items-center gap-2">
        <UButton variant="ghost" size="sm" icon="i-lucide-file-text" to="/benchmark/reports">Отчёты</UButton>
        <UButton variant="ghost" size="sm" to="/">← Чат</UButton>
      </div>
    </div>

    <UTabs
      v-model="tab"
      :items="[
        { label: 'Новый прогон', slot: 'new', value: 'new' },
        { label: `Прогоны (${runs.length})`, slot: 'runs', value: 'runs' },
      ]"
    >
      <template #new>
        <div class="mt-4 space-y-6">
          <BenchmarkSettings :loading="loading" @start="handleStart" />

          <UAlert v-if="error" color="error" icon="i-heroicons-exclamation-circle" :description="error" />

          <div v-if="activeRunId" class="flex items-center gap-3">
            <span class="text-sm text-gray-500 font-mono">{{ activeRunId }}</span>
            <UButton v-if="!summaryInterval" size="sm" variant="outline" @click="openRun(activeRunId!)">
              Открыть
            </UButton>
            <UButton v-else size="sm" color="error" variant="outline" @click="stopRun">
              Остановить
            </UButton>
          </div>

          <BenchmarkResults :summary="summary" :progress="progress" />
        </div>
      </template>

      <template #runs>
        <div class="mt-4 space-y-2">
          <div v-if="runs.length === 0" class="text-sm text-gray-400">
            Прогонов пока нет
          </div>
          <div
            v-for="run in runs"
            :key="run.runId"
            class="flex items-center justify-between p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50"
            @click="openRun(run.runId)"
          >
            <div>
              <p class="text-sm font-mono">{{ run.runId }}</p>
              <p class="text-xs text-gray-500">{{ run.model }} · {{ run.cellCount }} ячеек</p>
            </div>
            <UBadge :color="run.status === 'completed' ? 'success' : run.status === 'running' ? 'info' : 'error'">
              {{ run.status }}
            </UBadge>
          </div>
        </div>
      </template>
    </UTabs>
  </div>
</template>
