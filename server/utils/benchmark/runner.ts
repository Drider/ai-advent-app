import { callModel, classifyStatus } from './call'
import { gradeAnswer } from './grade'
import { judgeAnswer, type JudgeConfig } from './judge'
import { RateGate, runPool, type PoolJob } from './pool'
import { buildPrompt, extractGeneratedPrompt } from './prompts'
import { appendCell, appendGrade, cellKey, getDoneKeys, initRun } from './store'
import { BENCHMARK_TASKS } from './tasks'
import type { BenchmarkCell, BenchmarkConfig, BenchmarkEvent, BenchmarkGrade, BenchmarkTask, RunState } from './types'

export type { RunState }

const registry = new Map<string, RunState>()

export function getRunState(runId: string): RunState | undefined {
  return registry.get(runId)
}

export function emit(state: RunState, event: BenchmarkEvent): void {
  for (const listener of state.listeners) {
    try { listener(event) } catch { /* ignore */ }
  }
}

export function subscribe(runId: string, listener: (e: BenchmarkEvent) => void): (() => void) | null {
  const state = registry.get(runId)
  if (!state) return null
  state.listeners.add(listener)
  return () => state.listeners.delete(listener)
}

export interface StartRunOptions {
  runId: string
  config: BenchmarkConfig
  apiKey: string
  baseURL: string
  judgeConfig: JudgeConfig
  resume?: boolean
}

export function startRun(options: StartRunOptions): RunState {
  const { runId, config, apiKey, baseURL, judgeConfig, resume = false } = options

  const state: RunState = {
    id: runId,
    status: 'running',
    config,
    startedAt: new Date().toISOString(),
    progress: { completed: 0, total: 0 },
    listeners: new Set(),
    stopRequested: false,
  }
  registry.set(runId, state)

  const doneKeys = resume ? getDoneKeys(runId) : new Set<string>()
  if (!resume) initRun(runId, config)

  const tasks = BENCHMARK_TASKS.filter(t => config.taskIds.includes(t.id))
  const gate = new RateGate(config.requestsPerMinute ?? 0)
  const judgeGate = judgeConfig.judgeModel === config.model
    ? gate
    : new RateGate(config.requestsPerMinute ?? 0)

  // Build ordered job list: interleave by (method, effort) to spread load
  const jobs: PoolJob<void>[] = []
  for (let repeat = 1; repeat <= config.repeats; repeat++) {
    for (const method of config.methods) {
      for (const effort of config.efforts) {
        for (const task of tasks) {
          const key = cellKey({ model: config.model, effort, taskId: task.id, method, repeat })
          if (doneKeys.has(key)) {
            state.progress.completed++
            continue
          }
          state.progress.total++
          jobs.push({
            key,
            run: inflightAtStart => runCell({ task, method, effort, repeat, config, apiKey, baseURL, judgeConfig, gate, judgeGate, inflightAtStart, state }),
          })
        }
      }
    }
  }
  state.progress.total += state.progress.completed

  emit(state, { kind: 'progress', payload: state.progress })

  runPool(
    jobs,
    config.concurrency,
    gate,
    (_key, _result) => {},
    (key, err) => {
      console.error(`[benchmark] cell error ${key}:`, err)
    },
    () => state.stopRequested,
  ).then(() => {
    state.status = state.stopRequested ? 'stopped' : 'completed'
    state.completedAt = new Date().toISOString()
    emit(state, { kind: 'done', payload: { status: state.status } })
  }).catch((err) => {
    state.status = 'error'
    state.error = String(err)
    emit(state, { kind: 'error', payload: { message: state.error } })
  })

  return state
}

interface CellJobOptions {
  task: BenchmarkTask
  method: BenchmarkConfig['methods'][number]
  effort: BenchmarkConfig['efforts'][number]
  repeat: number
  config: BenchmarkConfig
  apiKey: string
  baseURL: string
  judgeConfig: JudgeConfig
  gate: RateGate
  judgeGate: RateGate
  inflightAtStart: number
  state: RunState
}

async function runCell(opts: CellJobOptions): Promise<void> {
  const { task, method, effort, repeat, config, apiKey, baseURL, judgeConfig, gate, judgeGate, inflightAtStart, state } = opts

  const key = cellKey({ model: config.model, effort, taskId: task.id, method, repeat })
  const callOpts = {
    model: config.model,
    effort,
    apiKey,
    baseURL,
    rateGate: gate,
  }

  let cell: BenchmarkCell

  try {
    if (method === 'self_prompt') {
      const prompt1 = buildPrompt(task, 'self_prompt')
      const call1 = await callModel({ ...callOpts, prompt: prompt1 })
      const generatedPrompt = extractGeneratedPrompt(call1.answer)
      const selfPromptLeaked = containsAnswer(call1.answer, task.answerKey)

      const call2 = await callModel({ ...callOpts, prompt: generatedPrompt })
      const status = classifyStatus(call2)

      cell = {
        type: 'cell',
        key,
        model: config.model,
        effort,
        taskId: task.id,
        method,
        repeat,
        answer: call2.answer,
        durationMs: call1.durationMs + call2.durationMs,
        inflightAtStart,
        usage: mergeUsage(call1.usage, call2.usage),
        finishReason: call2.finishReason,
        status,
        warnings: [...call1.warnings, ...call2.warnings],
        calls: [call1, call2],
        selfPromptLeaked,
      }
    } else {
      const prompt = buildPrompt(task, method)
      const call1 = await callModel({ ...callOpts, prompt })
      const status = classifyStatus(call1)

      cell = {
        type: 'cell',
        key,
        model: config.model,
        effort,
        taskId: task.id,
        method,
        repeat,
        answer: call1.answer,
        durationMs: call1.durationMs,
        inflightAtStart,
        usage: call1.usage,
        finishReason: call1.finishReason,
        status,
        warnings: call1.warnings,
        calls: [call1],
      }
    }
  } catch (err) {
    cell = errorCell(key, config.model, effort, task.id, method, repeat, inflightAtStart, err)
  }

  appendCell(state.id, cell)
  emit(state, { kind: 'cell', payload: cell })

  const grade = await gradeCell(cell, task, judgeConfig, judgeGate)
  appendGrade(state.id, grade)
  emit(state, { kind: 'grade', payload: grade })

  state.progress.completed++
  emit(state, { kind: 'progress', payload: state.progress })
}

async function gradeCell(
  cell: BenchmarkCell,
  task: BenchmarkTask,
  judgeConfig: JudgeConfig,
  judgeGate: RateGate,
): Promise<BenchmarkGrade> {
  if (cell.status === 'error' || cell.status === 'truncated' || cell.status === 'empty' || cell.status === 'refused') {
    return { type: 'grade', key: cell.key, verdict: 'incorrect' }
  }

  const verdict = gradeAnswer(cell.answer, task)
  if (verdict !== 'unparsed') {
    return { type: 'grade', key: cell.key, verdict }
  }

  const judged = await judgeAnswer(cell.answer, task, judgeConfig, judgeGate)
  return { type: 'grade', key: cell.key, verdict: judged.verdict, judged: true, judgeRaw: judged.judgeRaw }
}

function mergeUsage(
  a: BenchmarkCell['usage'],
  b: BenchmarkCell['usage'],
): BenchmarkCell['usage'] {
  return {
    inputTokens: add(a.inputTokens, b.inputTokens),
    outputTokens: add(a.outputTokens, b.outputTokens),
    reasoningTokens: add(a.reasoningTokens, b.reasoningTokens),
    totalTokens: add(a.totalTokens, b.totalTokens),
    cacheReadTokens: add(a.cacheReadTokens, b.cacheReadTokens),
  }
}

function add(a: number | null, b: number | null): number | null {
  if (a === null && b === null) return null
  return (a ?? 0) + (b ?? 0)
}

function containsAnswer(text: string, answerKey: string): boolean {
  return text.toLowerCase().includes(answerKey.toLowerCase())
}

function errorCell(
  key: string,
  model: string,
  effort: BenchmarkConfig['efforts'][number],
  taskId: string,
  method: BenchmarkConfig['methods'][number],
  repeat: number,
  inflightAtStart: number,
  err: unknown,
): BenchmarkCell {
  return {
    type: 'cell',
    key,
    model,
    effort,
    taskId,
    method,
    repeat,
    answer: '',
    durationMs: 0,
    inflightAtStart,
    usage: { inputTokens: null, outputTokens: null, reasoningTokens: null, totalTokens: null, cacheReadTokens: null },
    finishReason: 'error',
    status: 'error',
    warnings: [String(err)],
    calls: [],
  }
}
