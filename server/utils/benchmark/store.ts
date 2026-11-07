import { createHash } from 'node:crypto'
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { PROMPT_VERSION } from './prompts'
import type { BenchmarkCell, BenchmarkConfig, BenchmarkGrade, MetaLine } from './types'
import { BENCHMARK_TASKS } from './tasks'

const RUNS_DIR = join(process.cwd(), 'data', 'runs')

export function runPath(runId: string): string {
  return join(RUNS_DIR, `${runId}.jsonl`)
}

export function computeConfigHash(config: BenchmarkConfig): string {
  const tasks = BENCHMARK_TASKS.filter(t => config.taskIds.includes(t.id))
  const identity = {
    model: config.model,
    promptVersion: PROMPT_VERSION,
    methods: [...config.methods].sort(),
    tasks: tasks.map(t => ({ id: t.id, question: t.question, answerKey: t.answerKey })),
  }
  return createHash('sha256').update(JSON.stringify(identity)).digest('hex').slice(0, 12)
}

export function cellKey(cell: Pick<BenchmarkCell, 'model' | 'effort' | 'taskId' | 'method' | 'repeat'>): string {
  return `${cell.model}|${cell.effort}|${cell.taskId}|${cell.method}|${cell.repeat}`
}

export function initRun(runId: string, config: BenchmarkConfig): void {
  mkdirSync(RUNS_DIR, { recursive: true })
  const tasks = BENCHMARK_TASKS.filter(t => config.taskIds.includes(t.id))
  const meta: MetaLine = {
    type: 'meta',
    config,
    configHash: computeConfigHash(config),
    promptVersion: PROMPT_VERSION,
    taskTexts: Object.fromEntries(tasks.map(t => [t.id, { question: t.question, answerKey: t.answerKey }])),
    createdAt: new Date().toISOString(),
  }
  writeFileSync(runPath(runId), JSON.stringify(meta) + '\n')
}

export function appendCell(runId: string, cell: BenchmarkCell): void {
  appendFileSync(runPath(runId), JSON.stringify(cell) + '\n')
}

export function appendGrade(runId: string, grade: BenchmarkGrade): void {
  appendFileSync(runPath(runId), JSON.stringify(grade) + '\n')
}

export interface RunData {
  meta: MetaLine
  cells: BenchmarkCell[]
  grades: BenchmarkGrade[]
}

export function readRun(runId: string): RunData | null {
  const path = runPath(runId)
  if (!existsSync(path)) return null

  const lines = readFileSync(path, 'utf8').split('\n').filter(Boolean)
  const cells: BenchmarkCell[] = []
  const grades: BenchmarkGrade[] = []
  let meta: MetaLine | null = null

  for (const line of lines) {
    try {
      const obj = JSON.parse(line) as { type: string }
      if (obj.type === 'meta') meta = obj as MetaLine
      else if (obj.type === 'cell') cells.push(obj as BenchmarkCell)
      else if (obj.type === 'grade') grades.push(obj as BenchmarkGrade)
    } catch {
      // skip malformed line
    }
  }

  if (!meta) return null
  return { meta, cells, grades }
}

export function listRunIds(): string[] {
  if (!existsSync(RUNS_DIR)) return []
  return readdirSync(RUNS_DIR)
    .filter((f: string) => f.endsWith('.jsonl'))
    .map((f: string) => f.slice(0, -6))
    .sort()
    .reverse()
}

export function getDoneKeys(runId: string): Set<string> {
  const data = readRun(runId)
  if (!data) return new Set()
  return new Set(data.cells.filter(c => c.status !== 'error').map(c => c.key))
}
