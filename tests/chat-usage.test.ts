import { describe, expect, it } from 'vitest'
import type { LanguageModelUsage } from 'ai'
import { toChatUsage } from '../server/utils/chat-usage'

describe('toChatUsage', () => {
  it('preserves reported token categories and marks missing ones as unavailable', () => {
    const usage = {
      inputTokens: 20,
      inputTokenDetails: {
        noCacheTokens: 15,
        cacheReadTokens: 5,
        cacheWriteTokens: undefined,
      },
      outputTokens: 11,
      outputTokenDetails: {
        textTokens: 3,
        reasoningTokens: 8,
      },
      totalTokens: 31,
    } satisfies LanguageModelUsage

    expect(toChatUsage(usage)).toEqual({
      inputTokens: 20,
      inputTokenDetails: {
        noCacheTokens: 15,
        cacheReadTokens: 5,
        cacheWriteTokens: null,
      },
      outputTokens: 11,
      outputTokenDetails: {
        textTokens: 3,
        reasoningTokens: 8,
      },
      totalTokens: 31,
    })
  })
})
