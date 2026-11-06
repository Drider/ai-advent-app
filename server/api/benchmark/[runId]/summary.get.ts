import { createError, defineEventHandler, getRouterParam } from 'h3'
import { readRun } from '../../../utils/benchmark/store'
import { getRunState } from '../../../utils/benchmark/runner'
import { aggregate } from '../../../utils/benchmark/aggregate'

export default defineEventHandler((event) => {
  const runId = getRouterParam(event, 'runId')
  if (!runId) throw createError({ statusCode: 400, statusMessage: 'runId required' })

  const data = readRun(runId)
  if (!data) throw createError({ statusCode: 404, statusMessage: 'Run not found' })

  const state = getRunState(runId)
  const summary = aggregate(data.cells, data.grades, data.meta.config)

  return {
    runId,
    status: state?.status ?? 'completed',
    progress: state?.progress ?? { completed: data.cells.length, total: data.cells.length },
    ...summary,
  }
})
