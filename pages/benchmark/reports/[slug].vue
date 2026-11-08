<script setup lang="ts">
import { benchmarkLabel, type BenchmarkId } from '~/shared/benchmarks'

interface ReportDetail {
  slug: string
  title: string
  updatedAt: string
  content: string
  benchmarkId: BenchmarkId
}

const route = useRoute()
const slug = computed(() => String(route.params.slug))

const { data: report, status, error } = await useFetch<ReportDetail>(
  () => `/api/benchmark/reports/${slug.value}`,
)

useSeoMeta({ title: () => report.value?.title ?? 'Отчёт бенчмарка' })

const reportContent = useTemplateRef<HTMLElement>('reportContent')

// comark renders raw <table> elements; wrap each in a scrollable container
// so wide benchmark tables don't blow out the layout on narrow screens.
function wrapTables(): void {
  reportContent.value?.querySelectorAll('table').forEach((table) => {
    if (table.parentElement?.classList.contains('table-scroll')) return
    const wrapper = document.createElement('div')
    wrapper.className = 'table-scroll'
    table.replaceWith(wrapper)
    wrapper.appendChild(table)
  })
}

watch(() => report.value?.content, () => wrapTables(), { immediate: true, flush: 'post' })

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
}
</script>

<template>
  <div class="max-w-3xl mx-auto p-4 space-y-6">
    <div class="flex items-center justify-between">
      <UButton variant="ghost" size="sm" to="/benchmark/reports">← Отчёты</UButton>
      <span v-if="report" class="text-xs text-gray-400">{{ formatDate(report.updatedAt) }}</span>
    </div>

    <div v-if="status === 'pending'" class="text-sm text-gray-400">
      Загрузка…
    </div>

    <UAlert
      v-else-if="error"
      color="error"
      icon="i-lucide-file-x"
      title="Отчёт не найден"
      description="Возможно, файл был перемещён или удалён."
    />

    <div v-else-if="report" class="space-y-4">
      <UBadge color="primary" variant="subtle" size="sm">{{ benchmarkLabel(report.benchmarkId) }}</UBadge>
      <article ref="reportContent" class="report-content">
        <Markdown :value="report.content" />
      </article>
    </div>
  </div>
</template>

<style scoped>
.report-content :deep(h1) {
  font-size: 1.375rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.report-content :deep(h2) {
  font-size: 1.125rem;
  font-weight: 600;
  margin-top: 2rem;
  margin-bottom: 0.75rem;
}

.report-content :deep(h3) {
  font-size: 1rem;
  font-weight: 600;
  margin-top: 1.5rem;
  margin-bottom: 0.5rem;
}

.report-content :deep(p) {
  margin-bottom: 0.75rem;
  line-height: 1.6;
}

.report-content :deep(ul),
.report-content :deep(ol) {
  margin: 0.5rem 0 0.75rem 1.25rem;
  line-height: 1.6;
}

.report-content :deep(li) {
  margin-bottom: 0.25rem;
}

.report-content :deep(strong) {
  font-weight: 600;
}

.report-content :deep(code) {
  font-size: 0.85em;
  background: var(--ui-bg-elevated, #f3f4f6);
  padding: 0.1em 0.35em;
  border-radius: 0.25rem;
}

.report-content :deep(.table-scroll) {
  overflow-x: auto;
  margin: 1rem 0;
}

.report-content :deep(table) {
  border-collapse: collapse;
  font-size: 0.8125rem;
}

.report-content :deep(th),
.report-content :deep(td) {
  border: 1px solid var(--ui-border, #e5e7eb);
  padding: 0.375rem 0.625rem;
  text-align: left;
  vertical-align: top;
  white-space: nowrap;
}

.report-content :deep(th) {
  background: var(--ui-bg-elevated, #f9fafb);
  font-weight: 600;
}

.report-content :deep(hr) {
  border: none;
  border-top: 1px solid var(--ui-border, #e5e7eb);
  margin: 1.5rem 0;
}

.report-content :deep(blockquote) {
  border-left: 3px solid var(--ui-border, #e5e7eb);
  padding-left: 0.75rem;
  color: var(--ui-text-muted, #6b7280);
  margin: 0.75rem 0;
}
</style>
