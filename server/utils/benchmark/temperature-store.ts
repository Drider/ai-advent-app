import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { TemperatureCell, TemperatureConfig, TemperatureRun, TemperatureStatus } from './temperature'

const RUNS_DIR = join(process.cwd(), 'data', 'temperature-runs')

function runPath(runId: string): string {
  if (!/^temp-[\w-]+$/.test(runId)) throw new Error('Invalid temperature run ID')
  return join(RUNS_DIR, `${runId}.jsonl`)
}

export function initTemperatureRun(runId: string, config: TemperatureConfig): void {
  mkdirSync(RUNS_DIR, { recursive: true })
  writeFileSync(runPath(runId), JSON.stringify({ type: 'meta', createdAt: new Date().toISOString(), config }) + '\n')
}

export function appendTemperatureCell(runId: string, cell: TemperatureCell): void {
  appendFileSync(runPath(runId), JSON.stringify({ type: 'cell', ...cell }) + '\n')
}

export function finishTemperatureRun(runId: string, status: 'completed' | 'stopped' | 'error'): void {
  appendFileSync(runPath(runId), JSON.stringify({ type: 'status', status }) + '\n')
}

export function readTemperatureRun(runId: string): TemperatureRun | null {
  if (!/^temp-[\w-]+$/.test(runId)) return null
  const path = runPath(runId)
  if (!existsSync(path)) return null

  const lines = readFileSync(path, 'utf8').split('\n').filter(Boolean)
  let meta: { createdAt: string, config: TemperatureConfig } | null = null
  let status: TemperatureStatus = 'interrupted'
  const cells: TemperatureCell[] = []
  for (const line of lines) {
    try {
      const item = JSON.parse(line)
      if (item.type === 'meta') meta = item
      if (item.type === 'cell') cells.push(item)
      if (item.type === 'status') status = item.status
    } catch { /* Ignore a partial final line after a process interruption. */ }
  }
  if (!meta) return null
  return { runId, createdAt: meta.createdAt, config: meta.config, status, cells }
}

export function listTemperatureRuns(): TemperatureRun[] {
  if (!existsSync(RUNS_DIR)) return []
  return readdirSync(RUNS_DIR)
    .filter(name => /^temp-[\w-]+\.jsonl$/.test(name))
    .map(name => readTemperatureRun(name.slice(0, -6)))
    .filter((run): run is TemperatureRun => run !== null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}
