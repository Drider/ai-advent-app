import { createError, defineEventHandler, getRouterParam } from 'h3'
import { readTemperatureRun } from '../../../../utils/benchmark/temperature-store'
import { getTemperatureRunState } from '../../../../utils/benchmark/temperature-runner'
import { summarizeTemperatureRun } from '../../../../utils/benchmark/temperature'

export default defineEventHandler((event) => {
  const runId = getRouterParam(event, 'runId')
  const run = runId ? readTemperatureRun(runId) : null
  if (!run) throw createError({ statusCode: 404, statusMessage: 'Temperature run not found' })
  return summarizeTemperatureRun({ ...run, status: getTemperatureRunState(run.runId)?.status ?? run.status })
})
