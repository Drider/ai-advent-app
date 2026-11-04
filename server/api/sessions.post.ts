import { validateUIMessages } from 'ai'
import { createError, defineEventHandler, readBody, setResponseStatus } from 'h3'
import type { ChatMessage } from '../../shared/types/chat'
import { saveChatSession } from '../utils/chat-session'

export default defineEventHandler(async (event) => {
  // Проверяет формат и содержимое диалога перед записью на диск.
  const body = await readBody<unknown>(event)

  if (!body || typeof body !== 'object' || !('messages' in body)
    || !Array.isArray(body.messages) || body.messages.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'A non-empty messages array is required.',
    })
  }

  let messages: ChatMessage[]

  try {
    messages = await validateUIMessages<ChatMessage>({ messages: body.messages })
  } catch {
    throw createError({
      statusCode: 400,
      statusMessage: 'messages must contain valid UIMessage entries',
    })
  }

  try {
    // Возвращает успех только после завершения записи файла.
    const session = await saveChatSession(messages)
    setResponseStatus(event, 201)
    return session
  } catch (error) {
    console.error('[chat-session] failed to save chat session', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to save chat session.',
    })
  }
})
