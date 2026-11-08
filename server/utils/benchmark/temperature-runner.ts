import { randomUUID } from 'node:crypto'
import { callModel } from './call'
import { appendTemperatureCell, finishTemperatureRun, initTemperatureRun } from './temperature-store'
import { temperatureCases, type TemperatureCell, type TemperatureConfig } from './temperature'

interface ActiveRun {
  status: 'running' | 'completed' | 'stopped' | 'error'
  stopRequested: boolean
}

const activeRuns = new Map<string, ActiveRun>()

export function getTemperatureRunState(runId: string): ActiveRun | undefined {
  return activeRuns.get(runId)
}

export function stopTemperatureRun(runId: string): boolean {
  const state = activeRuns.get(runId)
  if (!state || state.status !== 'running') return false
  state.stopRequested = true
  return true
}

export function startTemperatureRun(config: TemperatureConfig, apiKey: string, baseURL: string): string {
  const runId = `temp-${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID().slice(0, 8)}`
  const state: ActiveRun = { status: 'running', stopRequested: false }
  initTemperatureRun(runId, config)
  activeRuns.set(runId, state)
  void executeRun(runId, state, config, apiKey, baseURL).catch((error) => {
    console.error(`[temperature benchmark] run ${runId} failed:`, error)
    state.status = 'error'
    try { finishTemperatureRun(runId, 'error') } catch { /* Storage may be the cause. */ }
  })
  return runId
}

async function executeRun(
  runId: string,
  state: ActiveRun,
  config: TemperatureConfig,
  apiKey: string,
  baseURL: string,
): Promise<void> {
  for (const { repeat, temperature, task } of temperatureCases(config)) {
    if (state.stopRequested) break
    const startedAt = Date.now()
    let cell: TemperatureCell
    try {
      const result = await callModel({
        model: config.model,
        effort: 'none',
        temperature,
        prompt: task.prompt,
        apiKey,
        baseURL,
      })
      cell = {
        taskId: task.id,
        prompt: task.prompt,
        temperature,
        repeat,
        answer: result.answer,
        status: result.finishReason === 'length' ? 'truncated' : result.answer.trim() ? 'answered' : 'empty',
        correct: task.expectedAnswer === null ? null : result.finishReason !== 'length' && result.answer.trim() === task.expectedAnswer,
        durationMs: result.durationMs,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        reasoningTokens: result.usage.reasoningTokens,
        finishReason: result.finishReason,
      }
    } catch (error) {
      cell = {
        taskId: task.id,
        prompt: task.prompt,
        temperature,
        repeat,
        answer: '',
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
        correct: task.expectedAnswer === null ? null : false,
        durationMs: Date.now() - startedAt,
        inputTokens: null,
        outputTokens: null,
        reasoningTokens: null,
        finishReason: 'error',
      }
    }
    appendTemperatureCell(runId, cell)
  }
  state.status = state.stopRequested ? 'stopped' : 'completed'
  finishTemperatureRun(runId, state.status)
}
