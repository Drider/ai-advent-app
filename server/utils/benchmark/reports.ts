import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { isBenchmarkId, type BenchmarkId } from '../../../shared/benchmarks'

const REPORTS_DIR = join(process.cwd(), 'data', 'experiments')

export interface ReportInfo {
  slug: string
  title: string
  date: string
  excerpt: string
  benchmarkId: BenchmarkId
}

export interface ReportDetail {
  slug: string
  title: string
  date: string
  content: string
  benchmarkId: BenchmarkId
}

function isReportFile(fileName: string): boolean {
  return fileName.endsWith('.md') && !fileName.includes('handoff')
}

function parseReport(content: string, fileName: string): { benchmarkId: BenchmarkId, date: string, body: string } {
  const frontmatter = content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)
  const benchmarkId = frontmatter?.[1]?.match(/^benchmark:\s*([\w-]+)\s*$/m)?.[1]
  const date = frontmatter?.[1]?.match(/^date:\s*(\d{4}-\d{2}-\d{2})\s*$/m)?.[1]

  if (!frontmatter || !benchmarkId || !isBenchmarkId(benchmarkId) || !date) {
    throw new Error(`${fileName}: add a valid benchmark and date to the report frontmatter`)
  }

  return { benchmarkId, date, body: content.slice(frontmatter[0].length).trimStart() }
}

function extractTitle(content: string, fallback: string): string {
  const match = content.match(/^#\s+(.+)$/m)
  return match?.[1] ? match[1].trim() : fallback
}

function extractExcerpt(content: string): string {
  const lines = content.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('|') && !trimmed.startsWith('`')) {
      return trimmed.length > 220 ? `${trimmed.slice(0, 220)}…` : trimmed
    }
  }
  return ''
}

export function listReports(): ReportInfo[] {
  if (!existsSync(REPORTS_DIR)) return []

  return readdirSync(REPORTS_DIR)
    .filter(isReportFile)
    .map((fileName) => {
      const path = join(REPORTS_DIR, fileName)
      const content = readFileSync(path, 'utf8')
      const { benchmarkId, date, body } = parseReport(content, fileName)
      const slug = fileName.slice(0, -'.md'.length)
      return {
        slug,
        title: extractTitle(body, slug),
        date,
        excerpt: extractExcerpt(body),
        benchmarkId,
      }
    })
    .sort((a, b) => b.date.localeCompare(a.date) || b.slug.localeCompare(a.slug))
}

export function readReport(slug: string): ReportDetail | null {
  if (!/^[a-zA-Z0-9._-]+$/.test(slug)) return null

  const fileName = `${slug}.md`
  if (!isReportFile(fileName)) return null

  const path = join(REPORTS_DIR, fileName)
  if (!existsSync(path)) return null

  const content = readFileSync(path, 'utf8')
  const { benchmarkId, date, body } = parseReport(content, fileName)
  return {
    slug,
    title: extractTitle(body, slug),
    date,
    content: body,
    benchmarkId,
  }
}
