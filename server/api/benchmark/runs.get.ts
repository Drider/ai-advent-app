import { defineEventHandler } from 'h3'
import { listRunIds, readRun } from '../../utils/benchmark/store'
import { getRunState } from '../../utils/benchmark/runner'

export default defineEventHandler(() => {
  const runIds = listRunIds()

  return runIds.map((runId) => {
    const state = getRunState(runId)
    const data = readRun(runId)
    return {
      runId,
      status: state?.status ?? 'completed',
      model: data?.meta.config.model ?? '',
      createdAt: data?.meta.createdAt ?? '',
      progress: state?.progress ?? { completed: data?.cells.length ?? 0, total: data?.cells.length ?? 0 },
      cellCount: data?.cells.length ?? 0,
    }
  })
})
