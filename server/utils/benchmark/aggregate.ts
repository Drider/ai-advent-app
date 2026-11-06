import type { BenchmarkCell, BenchmarkConfig, BenchmarkGrade, Verdict } from './types'

export interface CellSummary {
  key: string
  model: string
  effort: string
  taskId: string
  method: string
  repeat: number
  verdict: Verdict | 'error' | 'pending'
  status: string
  durationMs: number
  inputTokens: number | null
  outputTokens: number | null
  reasoningTokens: number | null
  cacheReadTokens: number | null
  selfPromptLeaked?: boolean
  judged?: boolean
}

export interface MethodSummary {
  method: string
  effort: string
  totalCells: number
  correct: number
  incorrect: number
  truncated: number
  empty: number
  refused: number
  error: number
  unparsed: number
  medianDurationMs: number
  p90DurationMs: number
  totalInputTokens: number
  totalOutputTokens: number
  totalReasoningTokens: number
  totalCacheReadTokens: number
  apiCallCount: number
}

export interface RunSummary {
  config: BenchmarkConfig
  cells: CellSummary[]
  byMethodEffort: MethodSummary[]
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? ((sorted[mid - 1]! + sorted[mid]!) / 2)
    : sorted[mid]!
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const idx = Math.ceil((p / 100) * sorted.length) - 1
  return sorted[Math.max(0, idx)]!
}

export function aggregate(
  cells: BenchmarkCell[],
  grades: BenchmarkGrade[],
  config: BenchmarkConfig,
): RunSummary {
  const gradeMap = new Map(grades.map(g => [g.key, g]))

  const cellSummaries: CellSummary[] = cells.map((cell) => {
    const grade = gradeMap.get(cell.key)
    return {
      key: cell.key,
      model: cell.model,
      effort: cell.effort,
      taskId: cell.taskId,
      method: cell.method,
      repeat: cell.repeat,
      verdict: cell.status === 'error' ? 'error' : (grade?.verdict ?? 'pending'),
      status: cell.status,
      durationMs: cell.durationMs,
      inputTokens: cell.usage.inputTokens,
      outputTokens: cell.usage.outputTokens,
      reasoningTokens: cell.usage.reasoningTokens,
      cacheReadTokens: cell.usage.cacheReadTokens,
      selfPromptLeaked: cell.selfPromptLeaked,
      judged: grade?.judged,
    }
  })

  const methodEffortGroups = new Map<string, CellSummary[]>()
  for (const cs of cellSummaries) {
    const key = `${cs.method}|${cs.effort}`
    if (!methodEffortGroups.has(key)) methodEffortGroups.set(key, [])
    methodEffortGroups.get(key)!.push(cs)
  }

  const byMethodEffort: MethodSummary[] = []
  for (const [key, group] of methodEffortGroups) {
    const [method, effort] = key.split('|') as [string, string]
    const durations = group.filter(c => c.status !== 'error').map(c => c.durationMs)

    const apiCallCount = group.reduce((sum, c) => {
      const cell = cells.find(x => x.key === c.key)
      return sum + (cell?.calls.length ?? 1)
    }, 0)

    byMethodEffort.push({
      method,
      effort,
      totalCells: group.length,
      correct: group.filter(c => c.verdict === 'correct').length,
      incorrect: group.filter(c => c.verdict === 'incorrect').length,
      truncated: group.filter(c => c.status === 'truncated').length,
      empty: group.filter(c => c.status === 'empty').length,
      refused: group.filter(c => c.status === 'refused').length,
      error: group.filter(c => c.status === 'error').length,
      unparsed: group.filter(c => c.verdict === 'unparsed').length,
      medianDurationMs: median(durations),
      p90DurationMs: percentile(durations, 90),
      totalInputTokens: group.reduce((s, c) => s + (c.inputTokens ?? 0), 0),
      totalOutputTokens: group.reduce((s, c) => s + (c.outputTokens ?? 0), 0),
      totalReasoningTokens: group.reduce((s, c) => s + (c.reasoningTokens ?? 0), 0),
      totalCacheReadTokens: group.reduce((s, c) => s + (c.cacheReadTokens ?? 0), 0),
      apiCallCount,
    })
  }

  byMethodEffort.sort((a, b) =>
    a.method.localeCompare(b.method) || a.effort.localeCompare(b.effort),
  )

  return { config, cells: cellSummaries, byMethodEffort }
}
