import type { ChatMessage, ChatRequestBody } from '../types/chat'

// Собирает тело запроса, сохраняя историю сообщений при добавлении настроек.
export function buildChatRequestBody(
  body: Partial<Omit<ChatRequestBody, 'messages'>> | undefined,
  messages: ChatMessage[],
  runId: string,
): ChatRequestBody {
  return {
    ...(body ?? {}),
    messages,
    runId,
  }
}

// Проверяет тело запроса перед передачей истории и параметров в AI SDK.
export function validateChatRequest(input: unknown): ChatRequestBody {
  if (!input || typeof input !== 'object') {
    throw new Error('Request body must be an object')
  }

  const body = input as Partial<ChatRequestBody>

  if (!Array.isArray(body.messages)) {
    throw new Error('messages must be an array')
  }

  if (!body.messages.every(isUIMessageLike)) {
    throw new Error('messages must contain valid UIMessage entries')
  }

  if (
    body.runId !== undefined
    && (typeof body.runId !== 'string' || body.runId.trim().length === 0)
  ) {
    throw new Error('runId must be a non-empty string')
  }

  if (
    body.maxOutputTokens !== undefined
    && (!Number.isSafeInteger(body.maxOutputTokens) || body.maxOutputTokens <= 0)
  ) {
    throw new Error('maxOutputTokens must be a positive integer')
  }

  if (
    body.stopSequence !== undefined
    && (typeof body.stopSequence !== 'string' || body.stopSequence.trim().length === 0)
  ) {
    throw new Error('stopSequence must be a non-empty string')
  }

  if (
    body.reasoning !== undefined
    && body.reasoning !== 'none'
    && body.reasoning !== 'low'
    && body.reasoning !== 'high'
    && body.reasoning !== 'max'
  ) {
    throw new Error('reasoning must be one of none, low, high, max')
  }

  return {
    messages: body.messages as ChatMessage[],
    ...(body.runId === undefined ? {} : { runId: body.runId }),
    ...(body.maxOutputTokens === undefined
      ? {}
      : { maxOutputTokens: body.maxOutputTokens }),
    ...(body.stopSequence === undefined
      ? {}
      : { stopSequence: body.stopSequence }),
    ...(body.reasoning === undefined
      ? {}
      : { reasoning: body.reasoning }),
  }
}

// Проверяет минимальную структуру UIMessage до передачи истории в AI SDK.
function isUIMessageLike(message: unknown): boolean {
  if (!message || typeof message !== 'object') {
    return false
  }

  const candidate = message as Record<string, unknown>
  const validRole = candidate.role === 'system'
    || candidate.role === 'user'
    || candidate.role === 'assistant'

  return typeof candidate.id === 'string'
    && validRole
    && Array.isArray(candidate.parts)
}
