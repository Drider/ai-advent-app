import type { BattleTask } from './battle-tasks'
import type { Verdict } from './types'

function finalAnswer(text: string): string {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean)
  const answerLines = lines
    .map((line) => {
      const cleaned = line.replace(/^[>*_`~\s]+/, '')
      return cleaned.match(/^(?:ответ|итог|вывод)\s*[:：]\s*(.*)$/i)?.[1]
    })
    .filter((line): line is string => line !== undefined)
  const answer = answerLines.at(-1) ?? lines.at(-1) ?? ''
  return answer.replace(/^[>*_`~\s]+|[*_`~\s]+$/g, '').trim()
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim()
}

function integers(text: string): number[] {
  return [...text.matchAll(/\d+/g)].map(match => Number.parseInt(match[0]!, 10))
}

function orderedNumbersMatch(actual: number[], expected: number[]): boolean {
  return actual.length === expected.length && expected.every((number, index) => actual[index] === number)
}

export function gradeBattleAnswer(answerText: string, task: BattleTask): Verdict {
  const answer = finalAnswer(answerText)
  const normalizedAnswer = normalize(answer)
  const normalizedFull = normalize(answerText)

  switch (task.answerShape) {
    case 'integer': {
      const expected = Number.parseInt(task.answerKey, 10)
      const values = integers(answer)
      if (values.length === 1 && values[0] === expected) return 'correct'
      return integers(answerText).includes(expected) ? 'unparsed' : 'incorrect'
    }

    case 'path+number': {
      const separator = task.answerKey.indexOf(', ')
      const expectedPath = task.answerKey.slice(0, separator).split('-')
      const expectedLength = Number.parseInt(task.answerKey.slice(separator + 2), 10)
      const pathMatch = answer.match(/(?:^|[^A-Z])([A-F](?:\s*[-–—→>]\s*[A-F])+)(?:$|[^A-Z])/i)?.[1]
      const actualPath = pathMatch?.match(/[A-F]/gi)?.map(node => node.toUpperCase()) ?? []
      const values = integers(answer)
      if (actualPath.join(',') === expectedPath.join(',') && values.length === 1 && values[0] === expectedLength) return 'correct'
      const fullPath = answerText.match(/(?:^|[^A-Z])([A-F](?:\s*[-–—→>]\s*[A-F])+)(?:$|[^A-Z])/i)?.[1]
      const fullNodes = fullPath?.match(/[A-F]/gi)?.map(node => node.toUpperCase()) ?? []
      if (fullNodes.join(',') === expectedPath.join(',') && integers(answerText).includes(expectedLength)) return 'unparsed'
      return 'incorrect'
    }

    case 'tuple': {
      const expected = task.answerKey.split(',').map(value => Number.parseInt(value.trim(), 10))
      if (orderedNumbersMatch(integers(answer), expected)) return 'correct'
      const allValues = integers(answerText)
      for (let start = 0; start <= allValues.length - expected.length; start++) {
        if (orderedNumbersMatch(allValues.slice(start, start + expected.length), expected)) return 'unparsed'
      }
      return 'incorrect'
    }

    case 'token': {
      const expected = normalize(task.answerKey)
      const distractors = task.distractors?.map(normalize) ?? []
      const hasExpected = normalizedAnswer.includes(expected)
      const hasDistractor = distractors.some(distractor => normalizedAnswer.includes(distractor))
      if (hasExpected && !hasDistractor) return 'correct'
      return normalizedFull.includes(expected) ? 'unparsed' : 'incorrect'
    }

    case 'winner+move': {
      const separator = task.answerKey.indexOf(', ')
      const expectedWinner = task.answerKey.slice(0, separator)
      const expectedMove = Number.parseInt(task.answerKey.slice(separator + 2), 10)
      const hasFirst = normalizedAnswer.includes('перв')
      const hasSecond = normalizedAnswer.includes('втор')
      const winnerMatches = expectedWinner === 'первый' ? hasFirst && !hasSecond : hasSecond && !hasFirst
      const moveMatch = answer.match(/(?:взять|убрать)\s*(?:ровно\s*)?(\d+)/i)
      const values = integers(answer)
      const moveMatches = moveMatch
        ? Number.parseInt(moveMatch[1]!, 10) === expectedMove
        : values.length === 1 && values[0] === expectedMove
      if (winnerMatches && moveMatches) return 'correct'
      return normalizedFull.includes(expectedWinner === 'первый' ? 'перв' : 'втор') && integers(answerText).includes(expectedMove)
        ? 'unparsed'
        : 'incorrect'
    }
  }
}
