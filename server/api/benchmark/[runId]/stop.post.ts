import { createError, defineEventHandler, getRouterParam } from 'h3'
import { getRunState } from '../../../utils/benchmark/runner'

export default defineEventHandler((event) => {
  const runId = getRouterParam(event, 'runId')
  if (!runId) throw createError({ statusCode: 400, statusMessage: 'runId required' })

  const state = getRunState(runId)
  if (!state) throw createError({ statusCode: 404, statusMessage: 'Run not found' })

  state.stopRequested = true
  return { ok: true }
})
