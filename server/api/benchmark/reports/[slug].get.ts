import { createError, defineEventHandler, getRouterParam } from 'h3'
import { readReport } from '../../../utils/benchmark/reports'

export default defineEventHandler((event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) throw createError({ statusCode: 400, statusMessage: 'slug required' })

  const report = readReport(slug)
  if (!report) throw createError({ statusCode: 404, statusMessage: 'Report not found' })

  return report
})
