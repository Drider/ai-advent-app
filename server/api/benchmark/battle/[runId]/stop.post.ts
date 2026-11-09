import { createError, defineEventHandler, getRouterParam } from 'h3'
import { stopBattleRun } from '../../../../utils/benchmark/battle-runner'

export default defineEventHandler((event) => {
  const runId = getRouterParam(event, 'runId')
  if (!runId || !stopBattleRun(runId)) {
    throw createError({ statusCode: 404, statusMessage: 'Active battle run not found' })
  }
  return { ok: true }
})
