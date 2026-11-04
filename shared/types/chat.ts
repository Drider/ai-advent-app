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

// Тип сообщения с метаданными, общими для клиента и сервера.
export type ChatMessage = UIMessage<ChatMessageMetadata>

// Тело запроса серверного маршрута.
export interface ChatRequestBody {
  messages: ChatMessage[]
  maxOutputTokens?: number
}
