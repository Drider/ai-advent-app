import { callModel } from './call'
import type { RateGate } from './pool'
import type { BenchmarkTask, Verdict } from './types'

export interface JudgeConfig {
  apiKey: string
  baseURL: string
  judgeModel: string
}

export async function judgeAnswer(
  answerText: string,
  task: BenchmarkTask,
  config: JudgeConfig,
  rateGate?: RateGate,
): Promise<{ verdict: Verdict, judgeRaw: string }> {
  const prompt = `Задача: ${task.question}\n\nЭталонный ответ: ${task.answerKey}\n\nОтвет модели:\n${answerText}\n\nСодержит ли ответ модели правильный итоговый ответ? Оцени только финальный вывод, игнорируя промежуточные рассуждения. Ответь строго JSON: {"correct": true} или {"correct": false}.`

  try {
    const result = await callModel({
      model: config.judgeModel,
      prompt,
      effort: 'none',
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      rateGate,
    })
    const text = result.answer
    const match = text.match(/\{[^}]*"correct"\s*:\s*(true|false)[^}]*\}/)
    if (match) {
      const correct = match[1] === 'true'
      return { verdict: correct ? 'correct' : 'incorrect', judgeRaw: text }
    }
    return { verdict: 'unparsed', judgeRaw: text }
  } catch (err) {
    return { verdict: 'unparsed', judgeRaw: String(err) }
  }
}
