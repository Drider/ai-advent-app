import { describe, expect, it } from 'vitest'
import {
  TEMPERATURE_REPEATS,
  TEMPERATURE_TASKS,
  TEMPERATURES,
  getTemperatureTaskSet,
  summarizeTemperatureRun,
  temperatureCases,
  type TemperatureCell,
  type TemperatureConfig,
} from '../server/utils/benchmark/temperature'

const config: TemperatureConfig = {
  model: 'upstage/solar-mini4',
  temperatures: [...TEMPERATURES],
  repeats: TEMPERATURE_REPEATS,
}

describe('temperature benchmark', () => {
  it('plans five independent calls for every task and temperature', () => {
    const cases = temperatureCases(config)
    expect(cases).toHaveLength(30)
    expect(new Set(cases.map(({ task, temperature, repeat }) => `${task.id}|${temperature}|${repeat}`)).size).toBe(30)
    expect(cases.filter(({ task, temperature }) => task.id === 'creative' && temperature === 1.2)).toHaveLength(5)
  })

  it('plans the new question set without changing the original set', () => {
    const interestingConfig: TemperatureConfig = { ...config, taskSetId: 'interesting' }
    const cases = temperatureCases(interestingConfig)
    expect(cases).toHaveLength(30)
    expect(cases.filter(({ task, temperature }) => task.id === 'exact' && temperature === 0.7)).toHaveLength(5)
    expect(cases[0]?.task.prompt).toContain('Трёхзначный код')
    expect(getTemperatureTaskSet(undefined).tasks[0].prompt).toContain('09:35')

    const codeTask = getTemperatureTaskSet('interesting').tasks[0]
    const solutions: string[] = []
    for (let first = 1; first <= 9; first++) {
      for (let second = 1; second <= 9; second++) {
        for (let last = 1; last <= 9; last++) {
          if (new Set([first, second, last]).size === 3
            && first === 2 * last
            && second === first - 1
            && first + second + last === 14) {
            solutions.push(`${first}${second}${last}`)
          }
        }
      }
    }
    expect(solutions).toEqual([codeTask.expectedAnswer])
  })

  it('uses the selected set in a run summary', () => {
    const task = getTemperatureTaskSet('interesting').tasks[0]
    const summary = summarizeTemperatureRun({
      runId: 'temp-interesting',
      createdAt: '2026-11-08T00:00:00Z',
      status: 'completed',
      config: { ...config, taskSetId: 'interesting' },
      cells: [{
        taskId: task.id,
        prompt: task.prompt,
        temperature: 0,
        repeat: 1,
        answer: '653',
        status: 'answered',
        correct: true,
        durationMs: 100,
        inputTokens: 10,
        outputTokens: 4,
        reasoningTokens: 0,
        finishReason: 'stop',
      }],
    })

    expect(summary.progress).toEqual({ completed: 1, total: 30 })
    expect(summary.groups[0]).toMatchObject({ title: 'Трёхзначный код', correct: 1 })
  })

  it('keeps each raw answer for later analysis and summarizes accuracy and variation', () => {
    const exact = TEMPERATURE_TASKS[0]
    const creative = TEMPERATURE_TASKS[1]
    const cell = (task: typeof exact | typeof creative, answer: string, repeat: number): TemperatureCell => ({
      taskId: task.id,
      prompt: task.prompt,
      temperature: 0,
      repeat,
      answer,
      status: 'answered',
      correct: task.id === 'creative' ? null : answer === '105',
      durationMs: 100,
      inputTokens: 10,
      outputTokens: 4,
      reasoningTokens: 0,
      finishReason: 'stop',
    })
    const cells = [cell(exact, '105', 1), cell(exact, '104', 2), cell(creative, 'Лист', 1), cell(creative, 'Рост', 2)]
    const summary = summarizeTemperatureRun({
      runId: 'temp-test',
      createdAt: '2026-11-08T00:00:00Z',
      status: 'running',
      config,
      cells,
    })

    expect(summary.progress).toEqual({ completed: 4, total: 30 })
    expect(summary.cells.map(item => item.answer)).toEqual(['105', '104', 'Лист', 'Рост'])
    expect(summary.groups.find(group => group.taskId === 'exact' && group.temperature === 0)).toMatchObject({ correct: 1, uniqueAnswers: 2 })
    expect(summary.groups.find(group => group.taskId === 'creative' && group.temperature === 0)).toMatchObject({ correct: null, uniqueAnswers: 2 })
  })
})
