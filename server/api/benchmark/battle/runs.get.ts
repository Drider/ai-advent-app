import { defineEventHandler } from 'h3'
import { listBattleRuns } from '../../../utils/benchmark/battle-store'
import { getBattleRunState } from '../../../utils/benchmark/battle-runner'

export default defineEventHandler(() => listBattleRuns().map(run => ({
  runId: run.runId,
  createdAt: run.createdAt,
  status: getBattleRunState(run.runId)?.status ?? run.status,
  completed: run.cells.length,
  total: run.config.taskIds.length * run.config.repeats * run.config.models.length,
})))
