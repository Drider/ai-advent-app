import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { BattleCell, BattleConfig, BattleRun, BattleStatus } from './battle'

const RUNS_DIR = join(process.cwd(), 'data', 'battle-runs')
const RUN_ID_PATTERN = /^battle-[\w-]+$/

function runPath(runId: string): string {
  if (!RUN_ID_PATTERN.test(runId)) throw new Error('Invalid battle run ID')
  return join(RUNS_DIR, runId + '.jsonl')
}

export function initBattleRun(runId: string, config: BattleConfig): void {
  mkdirSync(RUNS_DIR, { recursive: true })
  writeFileSync(runPath(runId), JSON.stringify({ type: 'meta', createdAt: new Date().toISOString(), config }) + '\n')
}

export function appendBattleCell(runId: string, cell: BattleCell): void {
  appendFileSync(runPath(runId), JSON.stringify({ type: 'cell', ...cell }) + '\n')
}

export function finishBattleRun(runId: string, status: 'completed' | 'stopped' | 'error'): void {
  appendFileSync(runPath(runId), JSON.stringify({ type: 'status', status }) + '\n')
}

export function readBattleRun(runId: string): BattleRun | null {
  if (!RUN_ID_PATTERN.test(runId)) return null
  const path = runPath(runId)
  if (!existsSync(path)) return null

  let meta: { createdAt: string, config: BattleConfig } | null = null
  let status: BattleStatus = 'interrupted'
  const cells: BattleCell[] = []
  for (const line of readFileSync(path, 'utf8').split('\n').filter(Boolean)) {
    try {
      const item = JSON.parse(line)
      if (item.type === 'meta') meta = item
      if (item.type === 'cell') cells.push(item)
      if (item.type === 'status') status = item.status
    } catch { /* Ignore a partial final line after process interruption. */ }
  }
  if (!meta) return null
  return { runId, createdAt: meta.createdAt, config: meta.config, status, cells }
}

export function listBattleRuns(): BattleRun[] {
  if (!existsSync(RUNS_DIR)) return []
  return readdirSync(RUNS_DIR)
    .filter(name => /^battle-[\w-]+\.jsonl$/.test(name))
    .map(name => readBattleRun(name.slice(0, -6)))
    .filter((run): run is BattleRun => run !== null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}
