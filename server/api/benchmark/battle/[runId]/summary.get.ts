import { createError, defineEventHandler, getRouterParam } from 'h3'
import { summarizeBattleRun } from '../../../../utils/benchmark/battle'
import { getBattleRunState } from '../../../../utils/benchmark/battle-runner'
import { readBattleRun } from '../../../../utils/benchmark/battle-store'

export default defineEventHandler((event) => {
  const runId = getRouterParam(event, 'runId')
  const run = runId ? readBattleRun(runId) : null
  if (!run) throw createError({ statusCode: 404, statusMessage: 'Battle run not found' })
  return summarizeBattleRun({ ...run, status: getBattleRunState(runId!)?.status ?? run.status })
})
