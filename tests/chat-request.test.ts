import { describe, expect, it } from 'vitest'
import { validateChatRequest } from '../shared/utils/chat'

describe('validateChatRequest', () => {
  it('accepts messages without optional settings', () => {
    expect(validateChatRequest({ messages: [] })).toEqual({ messages: [] })
  })

  it('accepts a positive integer token limit', () => {
    expect(validateChatRequest({ messages: [], maxOutputTokens: 1000 })).toEqual({
      messages: [],
      maxOutputTokens: 1000,
    })
  })

  it('accepts UIMessage entries with the required shape', () => {
    expect(validateChatRequest({
      messages: [{
        id: 'message-1',
        role: 'user',
        parts: [{ type: 'text', text: 'Hello' }],
      }],
    }).messages).toHaveLength(1)
  })

  it('rejects malformed UIMessage entries', () => {
    expect(() => validateChatRequest({
      messages: [{ role: 'user', parts: [] }],
    })).toThrow('messages must contain valid UIMessage entries')
  })

  it('rejects an invalid token limit', () => {
    expect(() => validateChatRequest({ messages: [], maxOutputTokens: 0 })).toThrow(
      'maxOutputTokens must be a positive integer',
    )
  })
})
