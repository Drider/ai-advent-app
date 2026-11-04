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
import { appendRunLogEntry, type RunLogLevel } from '../utils/run-logger'

function getRunLogLevel(value: unknown): RunLogLevel {
  return value === 'off' || value === 'detailed' || value === 'raw' ? value : 'basic'
}

function getMessageText(message: ChatMessage): string {
  return message.parts
    .filter(part => part.type === 'text')
    .map((part) => {
      const candidate = part as { text?: unknown }
      return typeof candidate.text === 'string' ? candidate.text : ''
    })
    .join('')
}

function getLastUserQuestion(messages: ChatMessage[]): string {
  const message = [...messages]
    .reverse()
    .find(message => message.role === 'user')

  return message ? getMessageText(message) : ''
}

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
  const {
    messages,
    runId: requestRunId,
    maxOutputTokens,
    stopSequence,
    reasoning = 'high',
  } = await readChatRequest(event)

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
  const startedAtMs = Date.now()
  const startedAt = new Date(startedAtMs).toISOString()
  const runId = requestRunId ?? startedAt
  const logLevel = getRunLogLevel(config.llmLogLevel)
  const rawResponse: unknown[] = []
  const modelMessages = await convertToModelMessages(messages)
  const result = streamText({
    model: provider.chat(config.llmModel),
    messages: modelMessages,
    ...(maxOutputTokens === undefined ? {} : { maxOutputTokens }),
    ...(stopSequence === undefined ? {} : { stopSequences: [stopSequence] }),
    reasoning,
    includeRawChunks: logLevel === 'raw',
    onChunk: ({ chunk }) => {
      if (logLevel === 'raw' && chunk.type === 'raw') {
        rawResponse.push(chunk.rawValue)
      }
    },
    onEnd: async (finish) => {
      try {
        await appendRunLogEntry({
          runId,
          level: logLevel,
          question: getLastUserQuestion(messages),
          answer: finish.text,
          startedAt,
          completedAt: new Date().toISOString(),
          durationMs: Date.now() - startedAtMs,
          usage: {
            inputTokens: finish.totalUsage.inputTokens ?? null,
            outputTokens: finish.totalUsage.outputTokens ?? null,
            totalTokens: finish.totalUsage.totalTokens ?? null,
          },
          request: {
            model: config.llmModel,
            messages: modelMessages as unknown[],
            ...(maxOutputTokens === undefined ? {} : { maxOutputTokens }),
            ...(stopSequence === undefined ? {} : { stopSequences: [stopSequence] }),
            reasoning,
          },
          response: {
            finishReason: finish.finishReason,
            rawFinishReason: finish.rawFinishReason,
            id: finish.response.id,
            modelId: finish.response.modelId,
          },
          rawResponse,
        })
      } catch (error) {
        // Ошибка записи лога не должна прерывать уже готовый ответ модели.
        console.error('[chat] failed to save run log', error)
      }
    },
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
        durationMs: Date.now() - startedAtMs,
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
