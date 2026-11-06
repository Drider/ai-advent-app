import type { BenchmarkTask, Verdict } from './types'

function extractFinalArea(text: string): string {
  const conclusionMatch = text.match(/(?:^|\n)(?:ответ|итог|вывод)[:\s]/im)
  if (conclusionMatch?.index !== undefined) {
    return text.slice(conclusionMatch.index).trim()
  }
  const paragraphs = text.split(/\n\n+/)
  if (paragraphs.length > 1) {
    return (paragraphs[paragraphs.length - 1] ?? '').trim()
  }
  return text.slice(-800).trim()
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[.,!?;:«»""''()[\]{}—–-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractIntegers(text: string): number[] {
  return [...text.matchAll(/\d+/g)].map(m => parseInt(m[0], 10))
}

export function gradeAnswer(answerText: string, task: BenchmarkTask): Verdict {
  const area = extractFinalArea(answerText)
  const normArea = normalize(area)
  const normFull = normalize(answerText)

  switch (task.answerShape) {
    case 'token': {
      const hasKey = normArea.includes(normalize(task.answerKey))
      const hasDistractor = (task.distractors ?? []).some(d => normArea.includes(normalize(d)))
      if (hasKey && !hasDistractor) return 'correct'
      if (normFull.includes(normalize(task.answerKey))) return 'unparsed'
      return 'incorrect'
    }

    case 'integer': {
      const keyNum = parseInt(task.answerKey, 10)
      const areaNums = extractIntegers(area)
      if (areaNums.length > 0 && areaNums[areaNums.length - 1] === keyNum) return 'correct'
      if (extractIntegers(answerText).includes(keyNum)) return 'unparsed'
      return 'incorrect'
    }

    case 'path+number': {
      const commaIdx = task.answerKey.indexOf(', ')
      const pathPart = task.answerKey.slice(0, commaIdx)
      const keyNum = parseInt(task.answerKey.slice(commaIdx + 2), 10)
      const pathNodes = pathPart.split('-')
      const pathRegex = new RegExp(pathNodes.join('[^a-zA-Z]*'), 'i')
      const hasPath = pathRegex.test(area)
      const hasNum = extractIntegers(area).includes(keyNum)
      if (hasPath && hasNum) return 'correct'
      if (pathRegex.test(answerText) && extractIntegers(answerText).includes(keyNum)) return 'unparsed'
      return 'incorrect'
    }

    case 'tuple': {
      const keyNums = task.answerKey.split(', ').map(s => parseInt(s.trim(), 10))
      const matchSubsequence = (nums: number[]): boolean => {
        let ki = 0
        for (const n of nums) {
          if (n === keyNums[ki]) ki++
          if (ki === keyNums.length) return true
        }
        return false
      }
      if (matchSubsequence(extractIntegers(area))) return 'correct'
      if (matchSubsequence(extractIntegers(answerText))) return 'unparsed'
      return 'incorrect'
    }

    case 'winner+move': {
      const commaIdx = task.answerKey.indexOf(', ')
      const winner = task.answerKey.slice(0, commaIdx)
      const moveNum = parseInt(task.answerKey.slice(commaIdx + 2), 10)
      const hasWinner = normArea.includes(normalize(winner))
      const hasMove = extractIntegers(area).includes(moveNum)
      if (hasWinner && hasMove) return 'correct'
      if (normFull.includes(normalize(winner)) && extractIntegers(answerText).includes(moveNum)) return 'unparsed'
      return 'incorrect'
    }
  }
}
