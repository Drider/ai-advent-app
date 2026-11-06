import type { LanguageModelUsage } from 'ai'
import type { ChatUsage } from '../../shared/types/chat'

// Сохраняет полную детализацию AI SDK и явно отмечает недоступные категории.
export function toChatUsage(usage: LanguageModelUsage): ChatUsage {
  return {
    inputTokens: usage.inputTokens ?? null,
    inputTokenDetails: {
      noCacheTokens: usage.inputTokenDetails?.noCacheTokens ?? null,
      cacheReadTokens: usage.inputTokenDetails?.cacheReadTokens ?? null,
      cacheWriteTokens: usage.inputTokenDetails?.cacheWriteTokens ?? null,
    },
    outputTokens: usage.outputTokens ?? null,
    outputTokenDetails: {
      textTokens: usage.outputTokenDetails?.textTokens ?? null,
      reasoningTokens: usage.outputTokenDetails?.reasoningTokens ?? null,
    },
    totalTokens: usage.totalTokens ?? null,
  }
}
