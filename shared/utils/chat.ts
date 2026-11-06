import type {
  ChatMessage,
  ChatRequestBody,
  ChatResponseSchema,
  ChatSettingsState,
} from '../types/chat'

const RESPONSE_SCHEMA_MAX_BYTES = 32 * 1024
const RESPONSE_SCHEMA_NAME_PATTERN = /^[A-Za-z0-9_-]+$/
const RESPONSE_SCHEMA_MAX_DESCRIPTION_LENGTH = 2_000
const MODEL_ID_MAX_LENGTH = 200

export const DEFAULT_CHAT_MODEL = 'deepseek/deepseek-v4.1-flash'

export interface NewSessionState {
  settings: ChatSettingsState
  sidebarOpen: boolean
}

export function createDefaultChatSettings(
  defaultResponseSchema: string,
  defaultModel = DEFAULT_CHAT_MODEL,
): ChatSettingsState {
  return {
    modelId: defaultModel,
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
  }
}

// Нормализует ID модели, который вводится в интерфейсе или приходит через API.
export function validateModelId(input: unknown): string {
  if (typeof input !== 'string') {
    throw new Error('model must be a non-empty ID without spaces (max 200 characters)')
  }

  const model = input.trim()
  if (!model || model.length > MODEL_ID_MAX_LENGTH || /\s/u.test(model)) {
    throw new Error('model must be a non-empty ID without spaces (max 200 characters)')
  }

  return model
}

export function prepareNewSessionState(
  currentSettings: ChatSettingsState,
  sidebarOpen: boolean,
  defaultResponseSchema: string,
  defaultModel = DEFAULT_CHAT_MODEL,
): NewSessionState {
  if (currentSettings.preserveSettingsOnNewSession) {
    return {
      settings: { ...currentSettings },
      sidebarOpen,
    }
  }

  return {
    settings: createDefaultChatSettings(defaultResponseSchema, defaultModel),
    sidebarOpen: false,
  }
}

const CODE_FENCE_PATTERN = /(```[\s\S]*?```|~~~[\s\S]*?~~~)/g

// Приводит LaTeX-делимитеры к синтаксису math-плагина Comark, не трогая кодовые блоки.
function normalizeMathDelimiters(text: string): string {
  const codeFences: string[] = []
  const protectedText = text.replace(CODE_FENCE_PATTERN, (codeFence) => {
    const placeholder = `@@chat-code-${codeFences.length}@@`
    codeFences.push(codeFence)
    return placeholder
  })

  const normalizedText = protectedText
    .replace(/\\\[([\s\S]*?)\\\]/g, (_match, content: string) => '$$' + content + '$$')
    .replace(/\\\(([\s\S]*?)\\\)/g, (_match, content: string) => {
      // Comark принимает $...$ за валюту, если формула начинается с цифры.
      return '$' + (/^\d/.test(content) ? `{${content}}` : content) + '$'
    })

  return normalizedText.replace(/@@chat-code-(\d+)@@/g, (_match, index: string) => {
    return codeFences[Number(index)] ?? _match
  })
}

// Оборачивает JSON-ответы в fenced-блок, потому что Markdown-рендерер иначе
// воспринимает объект как служебную разметку и не создаёт видимых узлов.
export function formatAssistantMessage(text: string): string {
  const formattedText = normalizeMathDelimiters(text)
  const trimmed = formattedText.trim()

  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    return formattedText
  }

  try {
    const parsed: unknown = JSON.parse(trimmed)

    if (parsed === null || typeof parsed !== 'object') {
      return formattedText
    }

    return `\`\`\`json\n${JSON.stringify(parsed, null, 2)}\n\`\`\``
  } catch {
    return formattedText
  }
}

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

// Разбирает JSON, введённый в редактор схемы, и применяет ту же проверку, что и сервер.
export function parseResponseSchemaText(text: string): ChatResponseSchema {
  let schema: unknown

  try {
    schema = JSON.parse(text)
  } catch {
    throw new Error('response schema must be valid JSON')
  }

  return validateResponseSchema({ schema })
}

// Проверяет ограничения Structured Outputs до обращения к платному API провайдера.
export function validateResponseSchema(input: unknown): ChatResponseSchema {
  if (!isRecord(input)) {
    throw new Error('responseSchema must be an object')
  }

  const name = input.name
  if (
    name !== undefined
    && (
      typeof name !== 'string'
      || name.length === 0
      || name.length > 64
      || !RESPONSE_SCHEMA_NAME_PATTERN.test(name)
    )
  ) {
    throw new Error('responseSchema.name must contain only letters, numbers, underscores, or dashes')
  }

  const description = input.description
  if (
    description !== undefined
    && (
      typeof description !== 'string'
      || description.length > RESPONSE_SCHEMA_MAX_DESCRIPTION_LENGTH
    )
  ) {
    throw new Error('responseSchema.description must be a string no longer than 2000 characters')
  }

  const schema = input.schema
  if (!isRecord(schema)) {
    throw new Error('responseSchema.schema must be an object')
  }

  if (schema.type !== 'object') {
    throw new Error('responseSchema.schema.type must be object')
  }

  const serializedSchema = JSON.stringify(schema)
  if (new TextEncoder().encode(serializedSchema).byteLength > RESPONSE_SCHEMA_MAX_BYTES) {
    throw new Error('responseSchema.schema is too large')
  }

  validateSchemaNode(schema, 'responseSchema.schema', 0)

  return {
    schema: schema as ChatResponseSchema['schema'],
    ...(name === undefined ? {} : { name }),
    ...(description === undefined ? {} : { description }),
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

  const model = body.model === undefined ? undefined : validateModelId(body.model)

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

  const responseSchema = body.responseSchema === undefined
    ? undefined
    : validateResponseSchema(body.responseSchema)

  return {
    messages: body.messages as ChatMessage[],
    ...(model === undefined ? {} : { model }),
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
    ...(responseSchema === undefined ? {} : { responseSchema }),
  }
}

function validateSchemaNode(node: Record<string, unknown>, path: string, depth: number): void {
  if (depth > 20) {
    throw new Error(`${path} is nested too deeply`)
  }

  if (node.type === 'object') {
    if (node.additionalProperties !== false) {
      throw new Error(`${path}.additionalProperties must be false`)
    }

    const properties = node.properties
    if (properties !== undefined) {
      if (!isRecord(properties)) {
        throw new Error(`${path}.properties must be an object`)
      }

      const required = node.required
      if (!Array.isArray(required) || Object.keys(properties).some(key => !required.includes(key))) {
        throw new Error(`${path}.required must include all properties`)
      }

      for (const [key, property] of Object.entries(properties)) {
        if (isRecord(property)) {
          validateSchemaNode(property, `${path}.properties.${key}`, depth + 1)
        }
      }
    }
  }

  if (isRecord(node.items)) {
    validateSchemaNode(node.items, `${path}.items`, depth + 1)
  }

  if (Array.isArray(node.anyOf)) {
    for (const [index, branch] of node.anyOf.entries()) {
      if (isRecord(branch)) {
        validateSchemaNode(branch, `${path}.anyOf[${index}]`, depth + 1)
      }
    }
  }

  if (isRecord(node.$defs)) {
    for (const [key, definition] of Object.entries(node.$defs)) {
      if (isRecord(definition)) {
        validateSchemaNode(definition, `${path}.$defs.${key}`, depth + 1)
      }
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
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
