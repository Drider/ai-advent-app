import { defineEventHandler } from 'h3'
import { listReports } from '../../utils/benchmark/reports'

export default defineEventHandler(() => listReports())
