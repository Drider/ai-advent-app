import { createError, defineEventHandler, readBody } from 'h3'
import { useRuntimeConfig } from '#imports'
import { parseBattleConfig } from '../../../utils/benchmark/battle'
import { startBattleRun } from '../../../utils/benchmark/battle-runner'

export default defineEventHandler(async (event) => {
  const runtimeConfig = useRuntimeConfig()
  if (!runtimeConfig.llmApiKey || !runtimeConfig.llmBaseUrl) {
    throw createError({ statusCode: 500, statusMessage: 'LLM configuration missing' })
  }
  const config = parseBattleConfig(await readBody<unknown>(event))
  if (!config) throw createError({ statusCode: 400, statusMessage: 'Invalid LLM battle settings' })
  return { runId: startBattleRun(config, runtimeConfig.llmApiKey, runtimeConfig.llmBaseUrl) }
})
