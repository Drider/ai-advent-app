export const BENCHMARKS = [
  { id: 'reasoning', label: 'LLM reasoning', path: '/benchmark' },
  { id: 'temperature', label: 'LLM temperature', path: '/benchmark/temperature' },
  { id: 'battle', label: 'LLM battle', path: '/benchmark/battle' },
] as const

export type BenchmarkId = (typeof BENCHMARKS)[number]['id']

export function isBenchmarkId(value: string): value is BenchmarkId {
  return BENCHMARKS.some(benchmark => benchmark.id === value)
}

export function benchmarkLabel(id: BenchmarkId): string {
  return BENCHMARKS.find(benchmark => benchmark.id === id)?.label ?? id
}
