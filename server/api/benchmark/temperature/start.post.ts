import { createError, defineEventHandler, readBody } from 'h3'
import { useRuntimeConfig } from '#imports'
import { validateModelId } from '../../../../shared/utils/chat'
import { startTemperatureRun } from '../../../utils/benchmark/temperature-runner'
import { TEMPERATURE_REPEATS, TEMPERATURES, TEMPERATURE_TASK_SETS, type TemperatureConfig, type TemperatureTaskSetId } from '../../../utils/benchmark/temperature'

export default defineEventHandler(async (event) => {
  const runtimeConfig = useRuntimeConfig()
  if (!runtimeConfig.llmApiKey || !runtimeConfig.llmBaseUrl) {
    throw createError({ statusCode: 500, statusMessage: 'LLM configuration missing' })
  }

  const body = await readBody<{ model?: unknown, taskSetId?: unknown }>(event)
  let model: string
  try {
    model = validateModelId(body?.model)
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid model ID' })
  }

  const taskSetId = body?.taskSetId ?? 'basic'
  if (typeof taskSetId !== 'string' || !Object.hasOwn(TEMPERATURE_TASK_SETS, taskSetId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid task set ID' })
  }

  const config: TemperatureConfig = {
    model,
    taskSetId: taskSetId as TemperatureTaskSetId,
    temperatures: [...TEMPERATURES],
    repeats: TEMPERATURE_REPEATS,
  }
  return { runId: startTemperatureRun(config, runtimeConfig.llmApiKey, runtimeConfig.llmBaseUrl) }
})
