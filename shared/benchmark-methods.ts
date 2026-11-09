export const BENCHMARK_METHODS = [
  { id: 'direct', label: 'Прямой ответ' },
  { id: 'step_by_step', label: 'Думай пошагово' },
  { id: 'self_prompt', label: 'Модель составляет промпт' },
  { id: 'experts', label: 'Три эксперта' },
] as const

export function benchmarkMethodLabel(method: string): string {
  return BENCHMARK_METHODS.find(item => item.id === method)?.label ?? method
}
