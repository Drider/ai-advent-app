import { describe, expect, it } from 'vitest'
import { parseMarkdown } from '@comark/nuxt/parse'
import math from '@comark/nuxt/plugins/math'
import {
  buildChatRequestBody,
  prepareNewSessionState,
  formatAssistantMessage,
  parseResponseSchemaText,
  validateChatRequest,
} from '../shared/utils/chat'

const validResponseSchema = {
  schema: {
    type: 'object',
    properties: {
      answer: { type: 'string' },
    },
    required: ['answer'],
    additionalProperties: false,
  },
}

describe('formatAssistantMessage', () => {
  it('wraps JSON object answers in a code block for the Markdown renderer', () => {
    expect(formatAssistantMessage('{"quest_type":"спасение","urgency":"высокая"}')).toBe(
      '```json\n{\n  "quest_type": "спасение",\n  "urgency": "высокая"\n}\n```',
    )
  })

  it('converts LaTeX delimiters to the syntax supported by the Markdown math plugin', () => {
    const answer = String.raw`Inline \(x^2\)

\[
\frac{1}{2}
\]`

    expect(formatAssistantMessage(answer)).toBe(`Inline $x^2$

$$
\\frac{1}{2}
$$`)
  })

  it('renders adjacent digit formulas without absorbing the words between them', async () => {
    const answer = String.raw`Последняя цифра — \(0\) или \(5\).`
    const document = await parseMarkdown(formatAssistantMessage(answer), {
      plugins: [math()],
    })

    expect(document.nodes).toEqual([[
      'p',
      {},
      'Последняя цифра — ',
      ['math', { class: 'math inline', content: '{0}' }, '{0}'],
      ' или ',
      ['math', { class: 'math inline', content: '{5}' }, '{5}'],
      '.',
    ]])
  })

  it('keeps regular Markdown answers unchanged', () => {
    expect(formatAssistantMessage('**Готово**')).toBe('**Готово**')
  })
})

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

  it('keeps the response schema when adding request options', () => {
    const messages = [{
      id: 'message-1',
      role: 'user' as const,
      parts: [{ type: 'text' as const, text: 'Return JSON' }],
    }]

    expect(buildChatRequestBody({ responseSchema: validResponseSchema }, messages, 'run-1')).toEqual({
      messages,
      responseSchema: validResponseSchema,
      runId: 'run-1',
    })
  })
})

describe('prepareNewSessionState', () => {
  const defaultResponseSchema = '{"type":"object"}'

  it('keeps settings and the sidebar open when preservation is enabled', () => {
    const currentSettings = {
      maxOutputTokensEnabled: true,
      maxOutputTokens: 2400,
      stopSequenceEnabled: true,
      stopSequence: '<END>',
      reasoningEnabled: false,
      reasoningEffort: 'low' as const,
      responseSchemaEnabled: true,
      responseSchema: '{"type":"object","additionalProperties":false}',
      showTokenBreakdown: true,
      showRawFinishReason: true,
      preserveSettingsOnNewSession: true,
    }

    expect(prepareNewSessionState(currentSettings, true, defaultResponseSchema)).toEqual({
      settings: currentSettings,
      sidebarOpen: true,
    })
  })

  it('resets settings and collapses the sidebar when preservation is disabled', () => {
    const currentSettings = {
      maxOutputTokensEnabled: true,
      maxOutputTokens: 2400,
      stopSequenceEnabled: true,
      stopSequence: '<END>',
      reasoningEnabled: false,
      reasoningEffort: 'low' as const,
      responseSchemaEnabled: true,
      responseSchema: '{"type":"object","additionalProperties":false}',
      showTokenBreakdown: true,
      showRawFinishReason: true,
      preserveSettingsOnNewSession: false,
    }

    expect(prepareNewSessionState(currentSettings, true, defaultResponseSchema)).toEqual({
      settings: {
        maxOutputTokensEnabled: false,
        maxOutputTokens: 1000,
        stopSequenceEnabled: false,
        stopSequence: '',
        reasoningEnabled: true,
        reasoningEffort: 'high',
        responseSchemaEnabled: false,
        responseSchema: defaultResponseSchema,
        showTokenBreakdown: false,
        showRawFinishReason: false,
        preserveSettingsOnNewSession: false,
      },
      sidebarOpen: false,
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

  it('accepts a strict object response schema', () => {
    expect(validateChatRequest({ messages: [], responseSchema: validResponseSchema })).toEqual({
      messages: [],
      responseSchema: validResponseSchema,
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

  it('rejects a response schema whose root is not an object', () => {
    expect(() => validateChatRequest({
      messages: [],
      responseSchema: { schema: { type: 'string' } },
    })).toThrow('responseSchema.schema.type must be object')
  })

  it('rejects a response schema that allows additional object properties', () => {
    expect(() => validateChatRequest({
      messages: [],
      responseSchema: {
        schema: {
          type: 'object',
          properties: { answer: { type: 'string' } },
          required: ['answer'],
        },
      },
    })).toThrow('responseSchema.schema.additionalProperties must be false')
  })
})

describe('parseResponseSchemaText', () => {
  it('parses the JSON schema entered in settings', () => {
    expect(parseResponseSchemaText(JSON.stringify(validResponseSchema.schema))).toEqual(
      validResponseSchema,
    )
  })

  it('rejects malformed JSON entered in settings', () => {
    expect(() => parseResponseSchemaText('{')).toThrow('response schema must be valid JSON')
  })
})
