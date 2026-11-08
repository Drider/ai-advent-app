export const TEMPERATURES = [0, 0.7, 1.2] as const
export const TEMPERATURE_REPEATS = 5

export const TEMPERATURE_TASK_SETS = {
  basic: {
    label: 'Базовый',
    tasks: [
      {
        id: 'exact',
        title: 'Задача с одним правильным ответом',
        prompt: 'Сколько минут прошло с 09:35 до 11:20 того же дня? Ответь только числом, без пояснений.',
        expectedAnswer: '105',
      },
      {
        id: 'creative',
        title: 'Генерация названий',
        prompt: 'Предложи пять коротких названий для приложения, которое помогает людям ухаживать за комнатными растениями. Для каждого названия добавь одно предложение с объяснением идеи.',
        expectedAnswer: null,
      },
    ],
  },
  interesting: {
    label: 'Задачи с ограничениями',
    tasks: [
      {
        id: 'exact',
        title: 'Трёхзначный код',
        prompt: 'Трёхзначный код состоит из разных ненулевых цифр. Первая цифра вдвое больше последней, вторая на единицу меньше первой, сумма всех цифр равна 14. Какой код? Ответь только тремя цифрами.',
        expectedAnswer: '653',
      },
      {
        id: 'creative',
        title: 'Названия для необычного магазина',
        prompt: 'Придумай пять необычных названий для книжного магазина на летающем острове. Каждое название — не более трёх слов; к каждому добавь слоган из одного предложения. Во всём ответе не используй слова «книга», «остров» и «небо».',
        expectedAnswer: null,
      },
    ],
  },
} as const

export const TEMPERATURE_TASKS = TEMPERATURE_TASK_SETS.basic.tasks
export type TemperatureTaskSetId = keyof typeof TEMPERATURE_TASK_SETS

export function getTemperatureTaskSet(id: TemperatureTaskSetId | undefined) {
  return TEMPERATURE_TASK_SETS[id ?? 'basic']
}

export type TemperatureTaskId = (typeof TEMPERATURE_TASKS)[number]['id']
export type TemperatureValue = (typeof TEMPERATURES)[number]
export type TemperatureStatus = 'running' | 'completed' | 'stopped' | 'interrupted' | 'error'

export interface TemperatureConfig {
  model: string
  taskSetId?: TemperatureTaskSetId
  temperatures: TemperatureValue[]
  repeats: number
}

export interface TemperatureCell {
  taskId: TemperatureTaskId
  prompt: string
  temperature: TemperatureValue
  repeat: number
  answer: string
  status: 'answered' | 'truncated' | 'empty' | 'error'
  error?: string
  correct: boolean | null
  durationMs: number
  inputTokens: number | null
  outputTokens: number | null
  reasoningTokens: number | null
  finishReason: string
}

export interface TemperatureRun {
  runId: string
  createdAt: string
  status: TemperatureStatus
  config: TemperatureConfig
  cells: TemperatureCell[]
}

export interface TemperatureGroup {
  taskId: TemperatureTaskId
  title: string
  temperature: TemperatureValue
  completed: number
  expected: number
  correct: number | null
  uniqueAnswers: number
  errors: number
}

export interface TemperatureSummary extends TemperatureRun {
  progress: { completed: number, total: number }
  groups: TemperatureGroup[]
}

export function temperatureCases(config: TemperatureConfig) {
  const tasks = getTemperatureTaskSet(config.taskSetId).tasks
  return Array.from({ length: config.repeats }, (_, index) => index + 1)
    .flatMap(repeat => config.temperatures.flatMap(temperature =>
      tasks.map(task => ({ repeat, temperature, task })),
    ))
}

export function summarizeTemperatureRun(run: TemperatureRun): TemperatureSummary {
  const tasks = getTemperatureTaskSet(run.config.taskSetId).tasks
  const groups = tasks.flatMap(task => run.config.temperatures.map((temperature) => {
    const cells = run.cells.filter(cell => cell.taskId === task.id && cell.temperature === temperature)
    return {
      taskId: task.id,
      title: task.title,
      temperature,
      completed: cells.length,
      expected: run.config.repeats,
      correct: task.expectedAnswer === null ? null : cells.filter(cell => cell.correct).length,
      uniqueAnswers: new Set(cells.filter(cell => cell.answer.trim()).map(cell => cell.answer.trim().replace(/\s+/g, ' '))).size,
      errors: cells.filter(cell => cell.status === 'error').length,
    }
  }))

  return {
    ...run,
    progress: {
      completed: run.cells.length,
      total: tasks.length * run.config.temperatures.length * run.config.repeats,
    },
    groups,
  }
}
