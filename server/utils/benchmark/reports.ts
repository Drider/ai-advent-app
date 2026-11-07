import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const REPORTS_DIR = join(process.cwd(), 'data', 'experiments')

export interface ReportInfo {
  slug: string
  title: string
  updatedAt: string
  excerpt: string
}

export interface ReportDetail {
  slug: string
  title: string
  updatedAt: string
  content: string
}

function isReportFile(fileName: string): boolean {
  return fileName.endsWith('.md') && !fileName.includes('handoff')
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
      const slug = fileName.slice(0, -'.md'.length)
      return {
        slug,
        title: extractTitle(content, slug),
        updatedAt: statSync(path).mtime.toISOString(),
        excerpt: extractExcerpt(content),
      }
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export function readReport(slug: string): ReportDetail | null {
  if (!/^[a-zA-Z0-9._-]+$/.test(slug)) return null

  const fileName = `${slug}.md`
  if (!isReportFile(fileName)) return null

  const path = join(REPORTS_DIR, fileName)
  if (!existsSync(path)) return null

  const content = readFileSync(path, 'utf8')
  return {
    slug,
    title: extractTitle(content, slug),
    updatedAt: statSync(path).mtime.toISOString(),
    content,
  }
}
