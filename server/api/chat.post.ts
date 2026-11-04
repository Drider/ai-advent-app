import { createOpenAI } from '@ai-sdk/openai'
import {
  convertToModelMessages,
  streamText,
  validateUIMessages,
} from 'ai'
import type { H3Event } from 'h3'
import { createError, defineEventHandler, getRequestHeader, readBody } from 'h3'
import type { ChatMessage, ChatRequestBody } from '../../shared/types/chat'
import { validateChatRequest } from '../../shared/utils/chat'

// Читает и проверяет тело входящего запроса чата.
async function readChatRequest(event: H3Event): Promise<ChatRequestBody> {
  let request: ChatRequestBody

  try {
    request = validateChatRequest(await readBody<unknown>(event))
  } catch (error) {
    throw createError({
      statusCode: 400,
      statusMessage: error instanceof Error ? error.message : 'Invalid chat request',
    })
  }

  try {
    const messages = await validateUIMessages<ChatMessage>({
      messages: request.messages,
    })

    return {
      ...request,
      messages,
    }
  } catch {
    throw createError({
      statusCode: 400,
      statusMessage: 'messages must contain valid UIMessage entries',
    })
  }
}

// Логирует детали на сервере и возвращает безопасное сообщение для клиента.
function getStreamErrorMessage(error: unknown): string {
  console.error('[chat] model stream failed', error)

  return 'Не удалось получить ответ модели. Проверьте настройки сервера и повторите запрос.'
}

export default defineEventHandler(async (event) => {
  // Загружаем секреты только на сервере из приватной конфигурации Nuxt.
  const config = useRuntimeConfig(event)
  const { messages, maxOutputTokens } = await readChatRequest(event)

  if (!config.llmApiKey || !config.llmBaseUrl || !config.llmModel) {
    throw createError({
      statusCode: 500,
      statusMessage: 'LLM server configuration is incomplete.',
    })
  }

  // Сохраняем совместимость с текущим OpenAI Chat Completions endpoint.
  const provider = createOpenAI({
    apiKey: config.llmApiKey,
    baseURL: config.llmBaseUrl,
  })
  const startedAt = Date.now()
  const modelMessages = await convertToModelMessages(messages)
  const result = streamText({
    model: provider.chat(config.llmModel),
    messages: modelMessages,
    ...(maxOutputTokens === undefined ? {} : { maxOutputTokens }),
  })

  return result.toUIMessageStreamResponse<ChatMessage>({
    originalMessages: messages,
    sendReasoning: true,
    messageMetadata: ({ part }) => {
      // Статистику и исходную причину завершения отправляем после генерации.
      if (part.type !== 'finish') {
        return undefined
      }

      return {
        durationMs: Date.now() - startedAt,
        rawFinishReason: part.rawFinishReason,
        usage: {
          inputTokens: part.totalUsage.inputTokens,
          outputTokens: part.totalUsage.outputTokens,
          totalTokens: part.totalUsage.totalTokens,
        },
      }
    },
    onError: getStreamErrorMessage,
    headers: {
      'x-chat-request-id': getRequestHeader(event, 'x-request-id') ?? 'local',
    },
  })
})
