import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { performance } from 'node:perf_hooks'
import { createOpenAI } from '@ai-sdk/openai'
import { streamText } from 'ai'

const root = new URL('../', import.meta.url)
const outputPath = new URL('../data/experiments/day3-deepseek-v4.1-flash-none.json', import.meta.url)
const modelId = 'deepseek/deepseek-v4.1-flash'

function readLocalEnvironment() {
  const values = {}

  for (const line of readFileSync(new URL('.env', root), 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Z_]+)=(.*)$/)
    if (match) values[match[1]] = match[2].trim()
  }

  return values
}

const env = readLocalEnvironment()
if (!env.LLM_API_KEY || !env.LLM_BASE_URL) {
  throw new Error('LLM_API_KEY and LLM_BASE_URL must be set in .env')
}

const provider = createOpenAI({
  apiKey: env.LLM_API_KEY,
  baseURL: env.LLM_BASE_URL,
  fetch: (url, init) => {
    const request = JSON.parse(init.body)
    return fetch(url, {
      ...init,
      body: JSON.stringify({ ...request, reasoning: { effort: 'none' } }),
    })
  },
})

const tasks = [
  {
    id: 'logic',
    title: 'Логика',
    question: 'Пропал ключ. Его взял один из четырёх человек. Анна говорит: «Ключ взял Борис». Борис: «Ключ взял Глеб». Вера: «Ключ взяла не я». Глеб: «Борис ошибается». Известно, что ровно одно высказывание истинно. Кто взял ключ?',
    answerKey: 'Вера',
  },
  {
    id: 'graph',
    title: 'Кратчайший путь',
    question: 'Дан неориентированный граф с рёбрами: A—B (4), A—C (2), B—C (1), B—D (5), C—D (8), C—E (10), D—E (2), D—F (6), E—F (3). Найдите кратчайший путь из A в F и его длину.',
    answerKey: 'A-C-B-D-E-F, 13',
  },
  {
    id: 'counting',
    title: 'Подсчёт',
    question: 'Сколько существует пятизначных чисел с попарно различными цифрами, у которых сумма цифр равна 18 и которые делятся на 5?',
    answerKey: '402',
  },
  {
    id: 'probability',
    title: 'Вероятность',
    question: 'В мешке 4 красных, 3 синих и 2 зелёных шара. Случайно вынули 3 шара без возвращения. Известно, что ровно два из них одного цвета, а третий — другого. Какова вероятность, что пара одинакового цвета красная?',
    answerKey: '6/11',
  },
  {
    id: 'optimization',
    title: 'Оптимизация',
    question: 'Можно выбрать проекты A, B, C, D и E. Их стоимость и польза: A — (4, 7), B — (5, 9), C — (3, 5), D — (6, 11), E — (2, 4). Бюджет — 12. Проект D можно выбрать только вместе с B, а E — только вместе с C. Какие проекты дают максимальную суммарную пользу и чему она равна?',
    answerKey: 'A, B, C; 21',
  },
]

function expertPrompt(question) {
  return `Ты рассматриваешь задачу с позиции трёх отдельных ролей: аналитика, инженера и критика.\n\n**Задача:** ${question}\n\nДай три **самостоятельных решения**. Каждая роль должна предложить свой подход, а не просто прокомментировать подход другой.\n\n### 1. Аналитик\n\nОпредели цель, ключевые требования и допущения. Предложи решение с точки зрения пользы, приоритетов и критериев успеха.\n\n### 2. Инженер\n\nПредложи реализуемое техническое или практическое решение: основные шаги, необходимые ресурсы, зависимости и способ проверки результата.\n\n### 3. Критик\n\nСначала предложи собственное альтернативное решение. Затем укажи слабые места и риски решений аналитика и инженера, а также условия, при которых каждое из них не сработает.\n\nОформи ответ в трёх отдельных разделах с названиями ролей. В каждом разделе явно выдели **«Моё решение»**. В конце добавь короткую таблицу сравнения трёх решений по пользе, сложности и рискам. Не своди их к одному общему решению.`
}

function extractGeneratedPrompt(text) {
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

async function callModel(prompt) {
  const started = performance.now()
  const result = streamText({
    model: provider.chat(modelId),
    prompt,
    reasoning: 'none',
  })

  const answer = await result.text
  const usage = await result.usage
  const finishReason = await result.rawFinishReason

  return {
    prompt,
    answer,
    durationMs: Math.round(performance.now() - started),
    usage: {
      inputTokens: usage.inputTokens ?? null,
      outputTokens: usage.outputTokens ?? null,
      reasoningTokens: usage.outputTokenDetails?.reasoningTokens ?? null,
      totalTokens: usage.totalTokens ?? null,
    },
    finishReason,
  }
}

const freshResults = {
  model: modelId,
  reasoning: 'none',
  wireReasoning: { effort: 'none' },
  generatedAt: new Date().toISOString(),
  methodology: 'One independent run per task and method; two calls for self_prompt; remove response formatting around the generated prompt before the second call; no output token limit, stop sequence, or response schema.',
  tasks,
  results: [],
}
const results = existsSync(outputPath) ? JSON.parse(readFileSync(outputPath, 'utf8')) : freshResults
const maxResults = Number(process.env.DAY3_MAX_RESULTS ?? tasks.length * 4)
results.methodology = freshResults.methodology

function save() {
  mkdirSync(new URL('../data/experiments/', import.meta.url), { recursive: true })
  writeFileSync(outputPath, `${JSON.stringify(results, null, 2)}\n`)
}

if (process.env.DAY3_REPLAY_SELF_PROMPT === '1') {
  for (const entry of results.results.filter(entry => entry.method === 'self_prompt' && !entry.error)) {
    const cleanedPrompt = extractGeneratedPrompt(entry.calls[0].answer)
    if (cleanedPrompt === entry.calls[1].prompt) continue
    entry.calls[1] = await callModel(cleanedPrompt)
    entry.answer = entry.calls[1].answer
    entry.totalTokens = entry.calls.reduce((sum, call) => sum + (call.usage.totalTokens ?? 0), 0)
    entry.durationMs = entry.calls.reduce((sum, call) => sum + call.durationMs, 0)
    save()
    console.log(`${entry.taskId} self_prompt replay: ${entry.totalTokens} tokens, ${entry.durationMs} ms`)
  }
  process.exit(0)
}

outer: for (const task of tasks) {
  for (const method of ['direct', 'step_by_step', 'self_prompt', 'experts']) {
    if (results.results.filter(result => !result.error).length >= maxResults) break outer
    const existingIndex = results.results.findIndex(result => result.taskId === task.id && result.method === method)
    if (existingIndex >= 0 && !results.results[existingIndex].error) continue
    if (existingIndex >= 0) results.results.splice(existingIndex, 1)

    const prompts = {
      direct: task.question,
      step_by_step: `Решай пошагово.\n\n${task.question}`,
      self_prompt: `Составь промпт для решения следующей задачи. Не решай её сейчас; верни только готовый промпт.\n\n${task.question}`,
      experts: expertPrompt(task.question),
    }

    const calls = []

    try {
      calls.push(await callModel(prompts[method]))

      if (method === 'self_prompt') {
        calls.push(await callModel(extractGeneratedPrompt(calls[0].answer)))
      }

      results.results.push({
        taskId: task.id,
        method,
        calls,
        answer: calls.at(-1).answer,
        totalTokens: calls.reduce((sum, call) => sum + (call.usage.totalTokens ?? 0), 0),
        durationMs: calls.reduce((sum, call) => sum + call.durationMs, 0),
      })
      console.log(`${task.id} ${method}: ${calls.length} call(s), ${results.results.at(-1).totalTokens} tokens, ${results.results.at(-1).durationMs} ms`)
    } catch (error) {
      results.results.push({ taskId: task.id, method, calls, error: error instanceof Error ? error.message : String(error) })
      console.error(`${task.id} ${method}: ${error instanceof Error ? error.message : String(error)}`)
    }

    save()
  }
}

console.log(`Saved ${results.results.length} task-method results to ${outputPath.pathname}`)
