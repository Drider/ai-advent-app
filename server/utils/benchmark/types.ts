import type { ChatReasoning } from '../../../shared/types/chat'

export type BenchmarkMethod = 'direct' | 'step_by_step' | 'self_prompt' | 'experts'

export type AnswerShape = 'token' | 'integer' | 'path+number' | 'tuple' | 'winner+move'

export type CellStatus = 'answered' | 'truncated' | 'empty' | 'refused' | 'error'

export type Verdict = 'correct' | 'incorrect' | 'unparsed'

export interface BenchmarkTask {
  id: string
  title: string
  question: string
  answerKey: string
  answerShape: AnswerShape
  distractors?: string[]
}

export interface BenchmarkConfig {
  model: string
  efforts: ChatReasoning[]
  taskIds: string[]
  methods: BenchmarkMethod[]
  repeats: number
  concurrency: number
  requestsPerMinute?: number
}

export interface CallResult {
  prompt: string
  answer: string
  durationMs: number
  usage: {
    inputTokens: number | null
    outputTokens: number | null
    reasoningTokens: number | null
    totalTokens: number | null
    cacheReadTokens: number | null
  }
  finishReason: string
  warnings: string[]
}

export interface BenchmarkCell {
  type: 'cell'
  key: string
  model: string
  effort: ChatReasoning
  taskId: string
  method: BenchmarkMethod
  repeat: number
  answer: string
  durationMs: number
  inflightAtStart: number
  usage: CallResult['usage']
  finishReason: string
  status: CellStatus
  warnings: string[]
  calls: CallResult[]
  selfPromptLeaked?: boolean
}

export interface BenchmarkGrade {
  type: 'grade'
  key: string
  verdict: Verdict
  judged?: boolean
  judgeRaw?: string
}

export interface MetaLine {
  type: 'meta'
  config: BenchmarkConfig
  configHash: string
  promptVersion: string
  taskTexts: Record<string, { question: string, answerKey: string }>
  createdAt: string
}

export interface RunState {
  id: string
  status: 'running' | 'completed' | 'stopped' | 'error'
  config: BenchmarkConfig
  startedAt: string
  completedAt?: string
  error?: string
  progress: { completed: number, total: number }
  listeners: Set<(event: BenchmarkEvent) => void>
  stopRequested: boolean
}

export interface BenchmarkEvent {
  kind: 'progress' | 'cell' | 'grade' | 'done' | 'error'
  payload: unknown
}
