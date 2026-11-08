import { defineEventHandler } from 'h3'
import { listTemperatureRuns } from '../../../utils/benchmark/temperature-store'
import { getTemperatureRunState } from '../../../utils/benchmark/temperature-runner'
import { getTemperatureTaskSet } from '../../../utils/benchmark/temperature'

export default defineEventHandler(() => listTemperatureRuns().map(run => ({
  runId: run.runId,
  model: run.config.model,
  taskSetId: run.config.taskSetId ?? 'basic',
  createdAt: run.createdAt,
  status: getTemperatureRunState(run.runId)?.status ?? run.status,
  completed: run.cells.length,
  total: run.config.temperatures.length * run.config.repeats * getTemperatureTaskSet(run.config.taskSetId).tasks.length,
})))
