import { describe, expect, it } from 'vitest'
import type { ChatResponseSchema } from '../shared/types/chat'
import { createResponseOutput } from '../server/utils/response-schema'

const responseSchema: ChatResponseSchema = {
  name: 'task_result',
  description: 'Результат выполнения задачи',
  schema: {
    type: 'object',
    properties: {
      answer: { type: 'string' },
    },
    required: ['answer'],
    additionalProperties: false,
  },
}

describe('createResponseOutput', () => {
  it('converts a response schema into an AI SDK JSON output format', async () => {
    const output = createResponseOutput(responseSchema)

    expect(output).toBeDefined()
    await expect(output?.responseFormat).resolves.toEqual({
      type: 'json',
      schema: responseSchema.schema,
      name: responseSchema.name,
      description: responseSchema.description,
    })
  })

  it('keeps the default text output when no response schema is configured', () => {
    expect(createResponseOutput(undefined)).toBeUndefined()
  })
})
