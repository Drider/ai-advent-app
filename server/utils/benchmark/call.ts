import { createOpenAI } from '@ai-sdk/openai'
import { streamText } from 'ai'
import type { ChatReasoning } from '../../../shared/types/chat'
import { createPolzaReasoningFetch } from '../polza-reasoning'
import type { RateGate } from './pool'
import type { CallResult, CellStatus } from './types'

const CALL_TIMEOUT_MS = 10 * 60 * 1000

const RETRY_DELAYS_MS = [2000, 8000, 30000]

function jitter(ms: number): number {
  return ms + Math.floor(Math.random() * ms * 0.3)
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function isRetryable(err: unknown): boolean {
  if (err && typeof err === 'object' && 'statusCode' in err) {
    if ([408, 429, 502, 503].includes(Number(err.statusCode))) return true
  }
  const msg = String(err).toLowerCase()
  return msg.includes('429') || msg.includes('503') || msg.includes('502') || msg.includes('408') || msg.includes('econnreset') || msg.includes('network')
}

function retryAfterMs(err: unknown): number | null {
  if (err && typeof err === 'object' && 'responseHeaders' in err) {
    const headers = err.responseHeaders
    if (headers && typeof headers === 'object') {
      const value = Object.entries(headers).find(([name]) => name.toLowerCase() === 'retry-after')?.[1]
      if (typeof value === 'string') {
        const seconds = Number(value)
        if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000
        const date = Date.parse(value)
        if (Number.isFinite(date)) return Math.max(0, date - Date.now())
      }
    }
  }
  const match = String(err).match(/retry-after[:\s]+(\d+)/i)
  return match ? parseInt(match[1]!, 10) * 1000 : null
}

export interface CallOptions {
  model: string
  effort: ChatReasoning
  prompt: string
  temperature?: number
  maxOutputTokens?: number
  apiKey: string
  baseURL: string
  rateGate?: RateGate
}

export async function callModel(options: CallOptions): Promise<CallResult> {
  const { model, effort, prompt, temperature, maxOutputTokens, apiKey, baseURL, rateGate } = options
  const provider = createOpenAI({
    apiKey,
    baseURL,
    fetch: createPolzaReasoningFetch(baseURL),
  })

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    await rateGate?.acquire()
    const startedAtMs = Date.now()
    try {
      const result = streamText({
        model: provider.chat(model),
        prompt,
        reasoning: effort,
        ...(temperature === undefined ? {} : { temperature }),
        ...(maxOutputTokens === undefined ? {} : { maxOutputTokens }),
        maxRetries: 0,
        abortSignal: AbortSignal.timeout(CALL_TIMEOUT_MS),
      })

      const [text, usage, finishReason, warnings] = await Promise.all([
        result.text,
        result.usage,
        result.rawFinishReason,
        result.warnings,
      ])

      return {
        prompt,
        answer: text,
        durationMs: Date.now() - startedAtMs,
        usage: {
          inputTokens: usage.inputTokens ?? null,
          outputTokens: usage.outputTokens ?? null,
          reasoningTokens: usage.outputTokenDetails?.reasoningTokens ?? null,
          totalTokens: usage.totalTokens ?? null,
          cacheReadTokens: usage.inputTokenDetails?.cacheReadTokens ?? null,
        },
        finishReason: finishReason ?? 'unknown',
        warnings: (warnings ?? []).map(w => JSON.stringify(w)),
      }
    } catch (err) {
      if (!isRetryable(err) || attempt >= RETRY_DELAYS_MS.length) throw err
      const delay = retryAfterMs(err) ?? jitter(RETRY_DELAYS_MS[attempt]!)
      rateGate?.pause(delay)
      await sleep(delay)
    }
  }

  throw new Error('unreachable')
}

export function classifyStatus(result: CallResult): CellStatus {
  if (result.finishReason === 'length') return 'truncated'
  if (!result.answer.trim() && (result.usage.reasoningTokens ?? 0) > 0) return 'empty'
  if (!result.answer.trim()) return 'refused'
  return 'answered'
}
