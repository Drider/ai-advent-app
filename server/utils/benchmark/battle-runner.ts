import { randomUUID } from 'node:crypto'
import { callModel } from './call'
import { battleCases, battlePrompt, type BattleCell, type BattleConfig } from './battle'
import { appendBattleCell, finishBattleRun, initBattleRun } from './battle-store'
import { gradeBattleAnswer } from './grade-battle'
import { RateGate } from './pool'

interface ActiveRun {
  status: 'running' | 'completed' | 'stopped' | 'error'
  stopRequested: boolean
}

const activeRuns = new Map<string, ActiveRun>()

export function getBattleRunState(runId: string): ActiveRun | undefined {
  return activeRuns.get(runId)
}

export function stopBattleRun(runId: string): boolean {
  const state = activeRuns.get(runId)
  if (!state || state.status !== 'running') return false
  state.stopRequested = true
  return true
}

export function startBattleRun(config: BattleConfig, apiKey: string, baseURL: string): string {
  const runId = 'battle-' + new Date().toISOString().replace(/[:.]/g, '-') + '-' + randomUUID().slice(0, 8)
  const state: ActiveRun = { status: 'running', stopRequested: false }
  initBattleRun(runId, config)
  activeRuns.set(runId, state)
  void executeRun(runId, state, config, apiKey, baseURL).catch((error) => {
    console.error('[battle benchmark] run ' + runId + ' failed:', error)
    state.status = 'error'
    try { finishBattleRun(runId, 'error') } catch { /* Storage may be the cause. */ }
  })
  return runId
}

async function executeRun(
  runId: string,
  state: ActiveRun,
  config: BattleConfig,
  apiKey: string,
  baseURL: string,
): Promise<void> {
  const gates = new Map(config.models.map(model => [model.id, new RateGate(config.requestsPerMinute ?? 0)]))
  for (const { modelId, task, repeat } of battleCases(config)) {
    if (state.stopRequested) break
    const prompt = battlePrompt(task)
    const startedAt = Date.now()
    let cell: BattleCell
    try {
      const result = await callModel({
        model: modelId,
        effort: config.effort,
        prompt,
        maxOutputTokens: config.maxOutputTokens,
        apiKey,
        baseURL,
        rateGate: gates.get(modelId),
      })
      const status = result.finishReason === 'length' ? 'truncated' : result.answer.trim() ? 'answered' : 'empty'
      cell = {
        modelId,
        taskId: task.id,
        repeat,
        prompt,
        answer: result.answer,
        status,
        verdict: status === 'answered' ? gradeBattleAnswer(result.answer, task) : null,
        durationMs: result.durationMs,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        reasoningTokens: result.usage.reasoningTokens,
        cacheReadTokens: result.usage.cacheReadTokens,
        finishReason: result.finishReason,
      }
    } catch (error) {
      cell = {
        modelId,
        taskId: task.id,
        repeat,
        prompt,
        answer: '',
        status: 'error',
        verdict: null,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startedAt,
        inputTokens: null,
        outputTokens: null,
        reasoningTokens: null,
        cacheReadTokens: null,
        finishReason: 'error',
      }
    }
    appendBattleCell(runId, cell)
  }
  state.status = state.stopRequested ? 'stopped' : 'completed'
  finishBattleRun(runId, state.status)
}
