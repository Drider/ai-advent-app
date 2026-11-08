import { createError, defineEventHandler, getRouterParam } from 'h3'
import { stopTemperatureRun } from '../../../../utils/benchmark/temperature-runner'

export default defineEventHandler((event) => {
  const runId = getRouterParam(event, 'runId')
  if (!runId || !stopTemperatureRun(runId)) {
    throw createError({ statusCode: 404, statusMessage: 'Active temperature run not found' })
  }
  return { ok: true }
})
