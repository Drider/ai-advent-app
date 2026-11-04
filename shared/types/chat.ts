import type { UIMessage } from 'ai'

// Токенная статистика, которую провайдер может вернуть после генерации.
export interface ChatUsage {
  inputTokens?: number
  outputTokens?: number
  totalTokens?: number
}

// Метаданные сообщения ассистента для отображения статистики запроса.
export interface ChatMessageMetadata {
  usage?: ChatUsage
  durationMs?: number
  rawFinishReason?: string
}

// Доступные режимы рассуждений для DeepSeek V4.1 Flash через Polza.
export type ReasoningEffort = 'low' | 'high' | 'max'
export type ChatReasoning = 'none' | ReasoningEffort

// Тип сообщения с метаданными, общими для клиента и сервера.
export type ChatMessage = UIMessage<ChatMessageMetadata>

// Тело запроса серверного маршрута.
export interface ChatRequestBody {
  messages: ChatMessage[]
  runId?: string
  maxOutputTokens?: number
  stopSequence?: string
  reasoning?: ChatReasoning
}
