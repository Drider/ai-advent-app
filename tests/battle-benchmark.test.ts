import { describe, expect, it } from 'vitest'
import { BATTLE_MODELS, battleCases, parseBattleConfig, summarizeBattleRun, type BattleCell, type BattleConfig } from '../server/utils/benchmark/battle'
import { BENCHMARK_TASKS } from '../server/utils/benchmark/tasks'

const config: BattleConfig = {
  models: BATTLE_MODELS.map(model => ({
    id: model.id,
    inputPerMillion: model.inputPerMillion,
    outputPerMillion: model.outputPerMillion,
  })),
  taskIds: BENCHMARK_TASKS.map(task => task.id),
  repeats: 3,
  effort: 'medium',
  maxOutputTokens: 8192,
}

describe('LLM battle', () => {
  it('plans one call per model, task and repeat while rotating model order', () => {
    const cases = battleCases(config)
    expect(cases).toHaveLength(54)
    expect(new Set(cases.map(item => [item.modelId, item.task.id, item.repeat].join('|'))).size).toBe(54)
    expect(cases[0]?.modelId).not.toBe(cases[3]?.modelId)
  })

  it('accepts only the chosen trio and 5–10 valid tasks', () => {
    expect(parseBattleConfig(config)).toEqual(config)
    expect(parseBattleConfig({ ...config, taskIds: config.taskIds.slice(0, 4) })).toBeNull()
    expect(parseBattleConfig({ ...config, models: [...config.models, config.models[0]] })).toBeNull()
    expect(parseBattleConfig({ ...config, repeats: 0 })).toBeNull()
    expect(parseBattleConfig({ ...config, requestsPerMinute: 30 })).toMatchObject({ requestsPerMinute: 30 })
    expect(parseBattleConfig({ ...config, requestsPerMinute: -1 })).toBeNull()
  })

  it('uses token usage and the saved tariff to summarize cost and accuracy', () => {
    const cell = (modelId: BattleCell['modelId'], verdict: BattleCell['verdict']): BattleCell => ({
      modelId,
      taskId: 'logic',
      repeat: 1,
      prompt: 'Вопрос',
      answer: 'Ответ',
      status: 'answered',
      verdict,
      durationMs: 2000,
      inputTokens: 1000,
      outputTokens: 2000,
      reasoningTokens: 500,
      cacheReadTokens: 0,
      finishReason: 'stop',
    })
    const summary = summarizeBattleRun({
      runId: 'battle-test',
      createdAt: '2026-11-08T00:00:00Z',
      status: 'running',
      config,
      cells: [cell(BATTLE_MODELS[0].id, 'correct'), cell(BATTLE_MODELS[1].id, 'unparsed')],
    })

    expect(summary.progress).toEqual({ completed: 2, total: 54 })
    expect(summary.byModel[0]).toMatchObject({
      correct: 1,
      inputTokens: 1000,
      outputTokens: 2000,
      reasoningTokens: 500,
      medianDurationMs: 2000,
      estimatedCostRub: (1000 * 5.95 + 2000 * 23.8) / 1_000_000,
    })
    expect(summary.byModel[1]?.unparsed).toBe(1)
    expect(summary.byModel[2]?.estimatedCostRub).toBe(0)

    const incomplete = summarizeBattleRun({
      ...summary,
      cells: [{ ...cell(BATTLE_MODELS[0].id, null), status: 'error', inputTokens: null, outputTokens: null }],
    })
    expect(incomplete.byModel[0]?.estimatedCostRub).toBeNull()
  })
})
