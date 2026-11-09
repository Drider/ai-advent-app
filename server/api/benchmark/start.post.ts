import { createError, defineEventHandler, readBody } from 'h3'
import { useRuntimeConfig } from '#imports'
import { BENCHMARK_TASKS } from '../../utils/benchmark/tasks'
import type { BenchmarkConfig, BenchmarkMethod } from '../../utils/benchmark/types'
import { startRun } from '../../utils/benchmark/runner'
import { readRun } from '../../utils/benchmark/store'
import type { ChatReasoning } from '../../../shared/types/chat'

const VALID_METHODS: BenchmarkMethod[] = ['direct', 'step_by_step', 'self_prompt', 'experts']
const VALID_EFFORTS = new Set(['none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'])
const VALID_TASK_IDS = new Set(BENCHMARK_TASKS.map(t => t.id))

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  if (!config.llmApiKey || !config.llmBaseUrl) {
    throw createError({ statusCode: 500, statusMessage: 'LLM configuration missing' })
  }

  const body = await readBody<Record<string, unknown>>(event)

  const model = typeof body.model === 'string' ? body.model : ''
  if (!model) throw createError({ statusCode: 400, statusMessage: 'model is required' })

  const efforts = (Array.isArray(body.efforts) ? body.efforts : []).filter(
    (e): e is ChatReasoning => typeof e === 'string' && VALID_EFFORTS.has(e),
  )
  if (efforts.length === 0) throw createError({ statusCode: 400, statusMessage: 'at least one effort required' })

  const taskIds = (Array.isArray(body.taskIds) ? body.taskIds : BENCHMARK_TASKS.map(t => t.id)).filter(
    (id): id is string => typeof id === 'string' && VALID_TASK_IDS.has(id),
  )
  if (taskIds.length === 0) throw createError({ statusCode: 400, statusMessage: 'at least one valid taskId required' })

  const methods = (Array.isArray(body.methods) ? body.methods : VALID_METHODS).filter(
    (m): m is BenchmarkMethod => VALID_METHODS.includes(m as BenchmarkMethod),
  )
  if (methods.length === 0) throw createError({ statusCode: 400, statusMessage: 'at least one valid method required' })

  const repeats = typeof body.repeats === 'number' && body.repeats >= 1 ? Math.floor(body.repeats) : 1
  const concurrency = typeof body.concurrency === 'number' && body.concurrency >= 1 ? Math.min(Math.floor(body.concurrency), 10) : 3
  const requestsPerMinute = body.requestsPerMinute === undefined ? 0 : body.requestsPerMinute
  if (!Number.isSafeInteger(requestsPerMinute) || (requestsPerMinute as number) < 0) {
    throw createError({ statusCode: 400, statusMessage: 'requestsPerMinute must be a non-negative integer' })
  }
  const resume = body.resume === true && typeof body.runId === 'string'

  const runId = (resume && typeof body.runId === 'string') ? body.runId : new Date().toISOString().replace(/[:.]/g, '-')

  if (resume) {
    const existing = readRun(runId)
    if (!existing) throw createError({ statusCode: 404, statusMessage: 'Run not found for resume' })
  }

  const benchConfig: BenchmarkConfig = { model, efforts, taskIds, methods, repeats, concurrency, requestsPerMinute: requestsPerMinute as number }

  const judgeModel = typeof body.judgeModel === 'string' ? body.judgeModel : model

  startRun({
    runId,
    config: benchConfig,
    apiKey: config.llmApiKey,
    baseURL: config.llmBaseUrl,
    judgeConfig: { apiKey: config.llmApiKey, baseURL: config.llmBaseUrl, judgeModel },
    resume,
  })

  return { runId }
})
