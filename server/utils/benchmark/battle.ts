import { BATTLE_CATEGORIES, BATTLE_TASKS, type BattleCategoryId, type BattleTask } from './battle-tasks'
import type { Verdict } from './types'

export const BATTLE_MODELS = [
  { id: 'upstage/solar-mini4', label: 'Solar Mini 4', role: 'Маленькая', inputPerMillion: 5.95, outputPerMillion: 23.8 },
  { id: 'deepseek/deepseek-v4.1-flash', label: 'DeepSeek V4.1 Flash', role: 'Средняя', inputPerMillion: 1.28, outputPerMillion: 23.25 },
  { id: 'anthropic/claude-opus-5.5', label: 'Claude Opus 5.5', role: 'Флагманская', inputPerMillion: 379.78, outputPerMillion: 1898.89 },
] as const

export type BattleModelId = (typeof BATTLE_MODELS)[number]['id']
export type BattleEffort = 'low' | 'medium' | 'high'
export type BattleStatus = 'running' | 'completed' | 'stopped' | 'interrupted' | 'error'

export interface BattleModelConfig {
  id: BattleModelId
  inputPerMillion: number
  outputPerMillion: number
}

export interface BattleConfig {
  models: BattleModelConfig[]
  taskIds: string[]
  repeats: number
  effort: BattleEffort
  maxOutputTokens: number
  requestsPerMinute?: number
}

export interface BattleCell {
  modelId: BattleModelId
  taskId: string
  repeat: number
  prompt: string
  answer: string
  status: 'answered' | 'truncated' | 'empty' | 'error'
  verdict: Verdict | null
  error?: string
  durationMs: number
  inputTokens: number | null
  outputTokens: number | null
  reasoningTokens: number | null
  cacheReadTokens: number | null
  finishReason: string
}

export interface BattleRun {
  runId: string
  createdAt: string
  status: BattleStatus
  config: BattleConfig
  cells: BattleCell[]
}

export interface AccuracyInterval {
  lower: number
  upper: number
}

export interface BattleModelSummary {
  modelId: BattleModelId
  label: string
  role: string
  completed: number
  expected: number
  correct: number
  unparsed: number
  errors: number
  medianDurationMs: number
  totalDurationMs: number
  inputTokens: number
  outputTokens: number
  reasoningTokens: number
  estimatedCostRub: number | null
  accuracyPercent: number
  majoritySolvedTasks: number
  taskCount: number
  confidence95: AccuracyInterval | null
}

export interface BattleCategoryModelSummary {
  modelId: BattleModelId
  correct: number
  expected: number
  accuracyPercent: number
  majoritySolvedTasks: number
  taskCount: number
  confidence95: AccuracyInterval | null
}

export interface BattleCategorySummary {
  categoryId: BattleCategoryId
  label: string
  taskCount: number
  byModel: BattleCategoryModelSummary[]
}

export interface BattleSummary extends BattleRun {
  progress: { completed: number, total: number }
  byModel: BattleModelSummary[]
  byCategory: BattleCategorySummary[]
}

export function parseBattleConfig(value: unknown): BattleConfig | null {
  if (!value || typeof value !== 'object') return null
  const body = value as Record<string, unknown>
  if (!Array.isArray(body.models) || body.models.length !== BATTLE_MODELS.length) return null
  const models: BattleModelConfig[] = []
  for (const item of body.models) {
    if (!item || typeof item !== 'object') return null
    const model = item as Record<string, unknown>
    if (!BATTLE_MODELS.some(known => known.id === model.id) || models.some(existing => existing.id === model.id)) return null
    if (typeof model.inputPerMillion !== 'number' || !Number.isFinite(model.inputPerMillion) || model.inputPerMillion < 0 || model.inputPerMillion > 100_000) return null
    if (typeof model.outputPerMillion !== 'number' || !Number.isFinite(model.outputPerMillion) || model.outputPerMillion < 0 || model.outputPerMillion > 100_000) return null
    models.push({
      id: model.id as BattleModelId,
      inputPerMillion: model.inputPerMillion,
      outputPerMillion: model.outputPerMillion,
    })
  }
  if (!Array.isArray(body.taskIds) || body.taskIds.length < 5 || body.taskIds.length > BATTLE_TASKS.length) return null
  const validIds = new Set(BATTLE_TASKS.map(task => task.id))
  if (body.taskIds.some(id => typeof id !== 'string' || !validIds.has(id)) || new Set(body.taskIds).size !== body.taskIds.length) return null
  if (!Number.isInteger(body.repeats) || (body.repeats as number) < 1 || (body.repeats as number) > 5) return null
  if (body.effort !== 'low' && body.effort !== 'medium' && body.effort !== 'high') return null
  if (!Number.isInteger(body.maxOutputTokens) || (body.maxOutputTokens as number) < 1024 || (body.maxOutputTokens as number) > 32768) return null
  if (body.requestsPerMinute !== undefined && (!Number.isSafeInteger(body.requestsPerMinute) || (body.requestsPerMinute as number) < 0)) return null
  return {
    models,
    taskIds: body.taskIds as string[],
    repeats: body.repeats as number,
    effort: body.effort,
    maxOutputTokens: body.maxOutputTokens as number,
    ...(body.requestsPerMinute === undefined ? {} : { requestsPerMinute: body.requestsPerMinute as number }),
  }
}

export function battlePrompt(task: BattleTask): string {
  return task.question + '\n\nВ последней строке запиши итог в формате «Ответ: ...». '
}

export function battleCases(config: BattleConfig): { modelId: BattleModelId, task: BattleTask, repeat: number }[] {
  const tasks = BATTLE_TASKS.filter(task => config.taskIds.includes(task.id))
  const modelIds = config.models.map(model => model.id)
  const cases: { modelId: BattleModelId, task: BattleTask, repeat: number }[] = []
  for (let repeat = 1; repeat <= config.repeats; repeat++) {
    tasks.forEach((task, taskIndex) => {
      // Rotate the order so one provider does not always run first.
      for (let offset = 0; offset < modelIds.length; offset++) {
        const modelId = modelIds[(taskIndex + repeat - 1 + offset) % modelIds.length]!
        cases.push({ modelId, task, repeat })
      }
    })
  }
  return cases
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!
}

function wilsonInterval(successes: number, total: number, available: boolean): AccuracyInterval | null {
  if (!available || total === 0) return null
  const z = 1.96
  const proportion = successes / total
  const denominator = 1 + z ** 2 / total
  const center = (proportion + z ** 2 / (2 * total)) / denominator
  const margin = z * Math.sqrt((proportion * (1 - proportion) / total) + (z ** 2 / (4 * total ** 2))) / denominator
  return {
    lower: Math.round(Math.max(0, center - margin) * 1000) / 10,
    upper: Math.round(Math.min(1, center + margin) * 1000) / 10,
  }
}

function summarizeTaskSuccess(run: BattleRun, modelId: BattleModelId, taskIds: string[]) {
  const majorityThreshold = Math.floor(run.config.repeats / 2) + 1
  const majoritySolvedTasks = taskIds.filter((taskId) => {
    const correct = run.cells.filter(cell => cell.modelId === modelId && cell.taskId === taskId && cell.verdict === 'correct').length
    return correct >= majorityThreshold
  }).length
  return {
    majoritySolvedTasks,
    taskCount: taskIds.length,
    confidence95: wilsonInterval(majoritySolvedTasks, taskIds.length, run.status === 'completed'),
  }
}

export function summarizeBattleRun(run: BattleRun): BattleSummary {
  const expected = run.config.taskIds.length * run.config.repeats
  const selectedTasks = BATTLE_TASKS.filter(task => run.config.taskIds.includes(task.id))
  const byModel = run.config.models.map((model) => {
    const info = BATTLE_MODELS.find(item => item.id === model.id)!
    const cells = run.cells.filter(cell => cell.modelId === model.id)
    const completeUsage = cells.every(cell => cell.inputTokens !== null && cell.outputTokens !== null)
    const inputTokens = cells.reduce((sum, cell) => sum + (cell.inputTokens ?? 0), 0)
    const outputTokens = cells.reduce((sum, cell) => sum + (cell.outputTokens ?? 0), 0)
    const correct = cells.filter(cell => cell.verdict === 'correct').length
    return {
      modelId: model.id,
      label: info.label,
      role: info.role,
      completed: cells.length,
      expected,
      correct,
      unparsed: cells.filter(cell => cell.verdict === 'unparsed').length,
      errors: cells.filter(cell => cell.status === 'error' || cell.status === 'truncated' || cell.status === 'empty').length,
      medianDurationMs: median(cells.filter(cell => cell.status !== 'error').map(cell => cell.durationMs)),
      totalDurationMs: cells.reduce((sum, cell) => sum + cell.durationMs, 0),
      inputTokens,
      outputTokens,
      reasoningTokens: cells.reduce((sum, cell) => sum + (cell.reasoningTokens ?? 0), 0),
      estimatedCostRub: completeUsage
        ? (inputTokens * model.inputPerMillion + outputTokens * model.outputPerMillion) / 1_000_000
        : null,
      accuracyPercent: expected === 0 ? 0 : Math.round((correct / expected) * 1000) / 10,
      ...summarizeTaskSuccess(run, model.id, run.config.taskIds),
    }
  })
  const byCategory = BATTLE_CATEGORIES.map((category) => {
    const taskIds = selectedTasks.filter(task => task.categoryId === category.id).map(task => task.id)
    const categoryModels = run.config.models.map((model) => {
      const cells = run.cells.filter(cell => cell.modelId === model.id && taskIds.includes(cell.taskId))
      const correct = cells.filter(cell => cell.verdict === 'correct').length
      const expected = taskIds.length * run.config.repeats
      return {
        modelId: model.id,
        correct,
        expected,
        accuracyPercent: expected === 0 ? 0 : Math.round((correct / expected) * 1000) / 10,
        ...summarizeTaskSuccess(run, model.id, taskIds),
      }
    })
    return { categoryId: category.id, label: category.label, taskCount: taskIds.length, byModel: categoryModels }
  }).filter(category => category.taskCount > 0)

  return {
    ...run,
    progress: { completed: run.cells.length, total: expected * run.config.models.length },
    byModel,
    byCategory,
  }
}
