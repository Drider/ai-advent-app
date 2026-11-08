import type { JSONSchema7, UIMessage } from 'ai'

// Токенная статистика, которую провайдер может вернуть после генерации.
export interface ChatUsage {
  inputTokens: number | null
  inputTokenDetails?: {
    noCacheTokens: number | null
    cacheReadTokens: number | null
    cacheWriteTokens: number | null
  }
  outputTokens: number | null
  outputTokenDetails?: {
    textTokens: number | null
    reasoningTokens: number | null
  }
  totalTokens: number | null
}

// Метаданные сообщения ассистента для отображения статистики запроса.
export interface ChatMessageMetadata {
  usage?: ChatUsage
  durationMs?: number
  rawFinishReason?: string
}

// Доступные режимы рассуждений для DeepSeek V4.1 Flash через Polza.
export type ReasoningEffort = 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max'
export type ChatReasoning = 'none' | ReasoningEffort

// Параметры интерфейса, которые могут переноситься в новую сессию.
export interface ChatSettingsState {
  modelId: string
  maxOutputTokensEnabled: boolean
  maxOutputTokens: number | null
  stopSequenceEnabled: boolean
  stopSequence: string
  // Опциональны для совместимости с сохранёнными настройками старых сессий.
  temperatureEnabled?: boolean
  temperature?: number | null
  reasoningEnabled: boolean
  reasoningEffort: ReasoningEffort
  responseSchemaEnabled: boolean
  responseSchema: string
  showTokenBreakdown: boolean
  showRawFinishReason: boolean
  preserveSettingsOnNewSession: boolean
}

// Тип сообщения с метаданными, общими для клиента и сервера.
export type ChatMessage = UIMessage<ChatMessageMetadata>

// Схема Structured Output, передаваемая OpenAI-совместимому провайдеру.
export interface ChatResponseSchema {
  schema: JSONSchema7
  name?: string
  description?: string
}

// Тело запроса серверного маршрута.
export interface ChatRequestBody {
  messages: ChatMessage[]
  model?: string
  runId?: string
  maxOutputTokens?: number
  stopSequence?: string
  temperature?: number
  reasoning?: ChatReasoning
  responseSchema?: ChatResponseSchema
}
