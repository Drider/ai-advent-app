import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { ChatResponseSchema, ChatUsage } from '../../shared/types/chat'

export type RunLogLevel = 'off' | 'basic' | 'detailed' | 'raw'

export type RunLogUsage = ChatUsage

export interface RunLogEntry {
  runId: string
  level: RunLogLevel
  question: string
  answer: string
  startedAt: string
  completedAt: string
  durationMs: number
  usage: RunLogUsage
  request?: {
    model: string
    messages: unknown[]
    maxOutputTokens?: number
    stopSequences?: string[]
    reasoning?: 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max'
    responseSchema?: ChatResponseSchema
  }
  response?: {
    finishReason?: string
    rawFinishReason?: string
    id?: string
    modelId?: string
  }
  rawResponse?: unknown[]
}

interface StoredRunLog {
  runId: string
  startedAt: string
  updatedAt: string
  level: Exclude<RunLogLevel, 'off'>
  requests: Array<Omit<RunLogEntry, 'runId' | 'level'>>
}

const ISO_RUN_ID_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
const pendingWrites = new Map<string, Promise<void>>()

function normalizeRunId(runId: string): string {
  return ISO_RUN_ID_PATTERN.test(runId) ? runId : new Date().toISOString()
}

function projectEntry(entry: RunLogEntry): Omit<RunLogEntry, 'runId' | 'level'> {
  const projected: Omit<RunLogEntry, 'runId' | 'level'> = {
    question: entry.question,
    answer: entry.answer,
    startedAt: entry.startedAt,
    completedAt: entry.completedAt,
    durationMs: entry.durationMs,
    usage: entry.usage,
  }

  if (entry.level === 'detailed' || entry.level === 'raw') {
    projected.request = entry.request
    projected.response = entry.response
  }

  if (entry.level === 'raw') {
    projected.rawResponse = entry.rawResponse ?? []
  }

  return projected
}

async function readStoredRunLog(filePath: string): Promise<StoredRunLog | null> {
  try {
    return JSON.parse(await readFile(filePath, 'utf8')) as StoredRunLog
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return null
    }

    throw error
  }
}

/** Сохраняет один запрос в общем JSON-файле текущего диалога. */
export async function appendRunLogEntry(
  entry: RunLogEntry,
  directory = join(process.cwd(), 'data', 'runs'),
): Promise<{ filePath: string } | null> {
  const level = entry.level

  if (level === 'off') {
    return null
  }

  const runId = normalizeRunId(entry.runId)
  const filePath = join(directory, `run-${runId}.json`)
  const previousWrite = pendingWrites.get(filePath) ?? Promise.resolve()
  const nextWrite = previousWrite
    .catch(() => undefined)
    .then(async () => {
      await mkdir(directory, { recursive: true })
      const existing = await readStoredRunLog(filePath)
      const log: StoredRunLog = existing ?? {
        runId,
        startedAt: entry.startedAt,
        updatedAt: entry.completedAt,
        level,
        requests: [],
      }

      log.updatedAt = entry.completedAt
      log.level = level
      log.requests.push(projectEntry(entry))

      const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.tmp`
      await writeFile(temporaryPath, `${JSON.stringify(log, null, 2)}\n`, 'utf8')
      await rename(temporaryPath, filePath)
    })

  pendingWrites.set(filePath, nextWrite)

  try {
    await nextWrite
  } finally {
    if (pendingWrites.get(filePath) === nextWrite) {
      pendingWrites.delete(filePath)
    }
  }

  return { filePath }
}
