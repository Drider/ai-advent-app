<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef } from 'vue'
import type { BattleConfig, BattleSummary } from '~/server/utils/benchmark/battle'

interface RunInfo {
  runId: string
  createdAt: string
  status: string
  completed: number
  total: number
}

const tab = shallowRef<'current' | 'history'>('current')
const loading = shallowRef(false)
const error = shallowRef('')
const runs = ref<RunInfo[]>([])
const summary = ref<BattleSummary | null>(null)
const activeRunId = shallowRef<string | null>(null)
const running = computed(() => summary.value?.status === 'running')
let pollTimer: ReturnType<typeof setInterval> | null = null

async function loadRuns(): Promise<void> {
  runs.value = await $fetch<RunInfo[]>('/api/benchmark/battle/runs')
}

function stopPolling(): void {
  if (pollTimer) clearInterval(pollTimer)
  pollTimer = null
}

async function refresh(): Promise<void> {
  if (!activeRunId.value) return
  try {
    summary.value = await $fetch<BattleSummary>('/api/benchmark/battle/' + activeRunId.value + '/summary')
    if (summary.value.status !== 'running') {
      stopPolling()
      await loadRuns()
    }
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause)
    stopPolling()
  }
}

async function openRun(runId: string): Promise<void> {
  stopPolling()
  activeRunId.value = runId
  summary.value = null
  error.value = ''
  tab.value = 'current'
  await refresh()
  if (running.value) pollTimer = setInterval(() => { void refresh() }, 2000)
}

async function start(config: BattleConfig): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    const result = await $fetch<{ runId: string }>('/api/benchmark/battle/start', {
      method: 'POST',
      body: config,
    })
    await loadRuns()
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
    await $fetch('/api/benchmark/battle/' + activeRunId.value + '/stop', { method: 'POST' })
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
        { label: 'История (' + runs.length + ')', slot: 'history', value: 'history' },
      ]"
    >
      <template #current>
        <div class="mt-4 space-y-5">
          <BattleSettings :loading="loading" :running="running" @start="start" />
          <UAlert v-if="error" color="error" :description="error" />
          <div v-if="activeRunId" class="flex flex-wrap items-center gap-3">
            <span class="font-mono text-xs text-muted">{{ activeRunId }}</span>
            <UButton v-if="running" size="sm" color="error" variant="outline" @click="stop">Остановить после текущего запроса</UButton>
          </div>
          <BattleResults :summary="summary" />
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
              <span class="block text-sm font-medium">{{ new Date(run.createdAt).toLocaleString('ru-RU') }}</span>
              <span class="block text-xs text-muted">{{ run.completed }} / {{ run.total }} запросов · {{ run.runId }}</span>
            </span>
            <UBadge :color="run.status === 'completed' ? 'success' : run.status === 'running' ? 'info' : 'warning'">{{ run.status }}</UBadge>
          </button>
        </div>
      </template>
    </UTabs>
  </div>
</template>
