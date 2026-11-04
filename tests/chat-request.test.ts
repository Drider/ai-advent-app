import { describe, expect, it } from 'vitest'
import {
  buildChatRequestBody,
  validateChatRequest,
} from '../shared/utils/chat'

describe('buildChatRequestBody', () => {
  it('keeps messages when adding request options', () => {
    const messages = [{
      id: 'message-1',
      role: 'user' as const,
      parts: [{ type: 'text' as const, text: 'Hello' }],
    }]

    expect(buildChatRequestBody({ maxOutputTokens: 1000 }, messages, 'run-1')).toEqual({
      messages,
      maxOutputTokens: 1000,
      runId: 'run-1',
    })
  })
})

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

  it('accepts a non-empty stop sequence', () => {
    expect(validateChatRequest({ messages: [], stopSequence: '<END>' })).toEqual({
      messages: [],
      stopSequence: '<END>',
    })
  })

  it('accepts a run identifier for session logging', () => {
    expect(validateChatRequest({
      messages: [],
      runId: '2026-11-04T12:00:00.000Z',
    })).toEqual({
      messages: [],
      runId: '2026-11-04T12:00:00.000Z',
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

  it('rejects an empty stop sequence', () => {
    expect(() => validateChatRequest({ messages: [], stopSequence: '   ' })).toThrow(
      'stopSequence must be a non-empty string',
    )
  })

  it('rejects an empty run identifier', () => {
    expect(() => validateChatRequest({ messages: [], runId: '   ' })).toThrow(
      'runId must be a non-empty string',
    )
  })
})
