import { jsonSchema, Output } from 'ai'
import type { ChatResponseSchema } from '../../shared/types/chat'

// Собирает structured-output конфигурацию только когда пользователь включил схему.
export function createResponseOutput(responseSchema: ChatResponseSchema | undefined) {
  if (responseSchema === undefined) {
    return undefined
  }

  return Output.object({
    schema: jsonSchema(responseSchema.schema),
    name: responseSchema.name ?? 'response',
    description: responseSchema.description,
  })
}
