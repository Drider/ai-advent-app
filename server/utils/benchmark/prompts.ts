import type { BenchmarkMethod, BenchmarkTask } from './types'

export const PROMPT_VERSION = '1'

export function buildPrompt(task: BenchmarkTask, method: BenchmarkMethod): string {
  switch (method) {
    case 'direct':
      return task.question
    case 'step_by_step':
      return `${task.question}\n\nДумай пошагово.`
    case 'self_prompt':
      return `Придумай эффективный промпт, который поможет языковой модели решить следующую задачу. Не решай задачу сам.\n\n**Задача:** ${task.question}\n\nВыведи только промпт, без пояснений. Оформи его между строками «---».\n\n**Промпт:**`
    case 'experts':
      return expertPrompt(task.question)
  }
}

export function expertPrompt(question: string): string {
  return `Ты рассматриваешь задачу с позиции трёх отдельных ролей: аналитика, инженера и критика.\n\n**Задача:** ${question}\n\nДай три **самостоятельных решения**. Каждая роль должна предложить свой подход, а не просто прокомментировать подход другой.\n\n### 1. Аналитик\n\nОпредели цель, ключевые требования и допущения. Предложи решение с точки зрения пользы, приоритетов и критериев успеха.\n\n### 2. Инженер\n\nПредложи реализуемое техническое или практическое решение: основные шаги, необходимые ресурсы, зависимости и способ проверки результата.\n\n### 3. Критик\n\nСначала предложи собственное альтернативное решение. Затем укажи слабые места и риски решений аналитика и инженера, а также условия, при которых каждое из них не сработает.\n\nОформи ответ в трёх отдельных разделах с названиями ролей. В каждом разделе явно выдели **«Моё решение»**. В конце добавь короткую таблицу сравнения трёх решений по пользе, сложности и рискам. Не своди их к одному общему решению.`
}

export function extractGeneratedPrompt(text: string): string {
  let prompt = text.trim()
  const label = '**Промпт:**'
  const labelIndex = prompt.indexOf(label)
  if (labelIndex >= 0) prompt = prompt.slice(labelIndex + label.length).trim()
  prompt = prompt.replace(/^---\s*/, '').replace(/\s*---$/, '').trim()
  if (prompt.startsWith('«')) {
    const closingQuote = prompt.lastIndexOf('»')
    if (closingQuote > 0) prompt = prompt.slice(1, closingQuote)
  }
  return prompt.trim()
}
