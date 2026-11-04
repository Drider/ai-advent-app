<script setup lang="ts">
import {
  DefaultChatTransport,
  isReasoningUIPart,
  isTextUIPart,
} from 'ai'
import type { ChatRequestOptions } from 'ai'
import { useChat } from '@ai-sdk/vue'
import { isPartStreaming } from '@nuxt/ui/utils/ai'
import { computed, ref, shallowRef } from 'vue'
import type { ChatMessage } from '~/shared/types/chat'

const input = ref('')
const maxOutputTokensEnabled = shallowRef(false)
const maxOutputTokens = ref<number | null>(1000)
const showRawFinishReason = shallowRef(false)
const sidebarOpen = ref(false)
const validationMessage = ref('')

const {
  messages,
  status,
  error,
  sendMessage,
  stop,
  regenerate,
} = useChat<ChatMessage>({
  // В актуальной версии @ai-sdk/vue useChat предоставляет реактивное состояние
  // чата; устаревший класс Chat требует внутренний Vue-контекст и не вызывается
  // напрямую из script setup.
  transport: new DefaultChatTransport<ChatMessage>({
    api: '/api/chat',
  }),
})

const isPromptDisabled = computed(() => status.value === 'error')
const isBusy = computed(() => status.value === 'submitted' || status.value === 'streaming')

// Передаёт лимит токенов только при включении соответствующей настройки.
function getRequestOptions(): ChatRequestOptions | undefined {
  validationMessage.value = ''

  if (!maxOutputTokensEnabled.value) {
    return undefined
  }

  const value = Number(maxOutputTokens.value)

  if (!Number.isSafeInteger(value) || value <= 0) {
    validationMessage.value = 'Введите положительное целое число токенов.'
    return undefined
  }

  return {
    body: {
      maxOutputTokens: value,
    },
  }
}

// Отправляет новое сообщение и очищает поле после успешной постановки запроса.
async function handleSubmit(event: Event): Promise<void> {
  event.preventDefault()
  const text = input.value.trim()

  if (!text || isPromptDisabled.value || isBusy.value) {
    return
  }

  const options = getRequestOptions()

  if (maxOutputTokensEnabled.value && !options) {
    return
  }

  input.value = ''
  await sendMessage({ text }, options)
}

// Повторяет последний ответ с текущим состоянием настроек.
async function handleRegenerate(): Promise<void> {
  const options = getRequestOptions()

  if (maxOutputTokensEnabled.value && !options) {
    return
  }

  await regenerate(options)
}

// Показывает длительность и токенную статистику в компактном виде.
function formatMetric(value: number | undefined): string {
  return typeof value === 'number' ? value.toLocaleString('ru-RU') : '—'
}

// Определяет, относится ли текущая часть к активному потоку ответа.
function isStreamingPart(message: ChatMessage, part: { state?: string }): boolean {
  return status.value === 'streaming'
    && message.id === messages.value.at(-1)?.id
    && isPartStreaming(part)
}
</script>

<template>
  <main class="chat-shell">
    <aside
      class="settings-sidebar"
      :class="{ 'settings-sidebar--open': sidebarOpen }"
      aria-label="Настройки запроса"
    >
      <div class="settings-sidebar__top">
        <span v-if="sidebarOpen" class="settings-sidebar__title">Настройки</span>
        <UButton
          color="neutral"
          variant="ghost"
          size="sm"
          square
          :aria-label="sidebarOpen ? 'Свернуть настройки' : 'Развернуть настройки'"
          :icon="sidebarOpen ? 'i-lucide-panel-left-close' : 'i-lucide-panel-left-open'"
          @click="sidebarOpen = !sidebarOpen"
        />
      </div>

      <ChatSettings
        v-if="sidebarOpen"
        v-model:max-output-tokens-enabled="maxOutputTokensEnabled"
        v-model:max-output-tokens="maxOutputTokens"
        v-model:show-raw-finish-reason="showRawFinishReason"
        :validation-message="validationMessage"
      />
    </aside>

    <section class="chat-panel">
      <header class="chat-header">
        <div>
          <p class="chat-eyebrow">AI SDK · DeepSeek</p>
          <h1>Чат с моделью</h1>
        </div>
        <div class="chat-header__actions">
          <UBadge color="neutral" variant="subtle">
            {{ status === 'streaming' ? 'Генерация' : status === 'submitted' ? 'Подключение' : 'Готово' }}
          </UBadge>
          <UColorModeButton
            color="neutral"
            variant="ghost"
            size="sm"
            aria-label="Переключить тему"
          />
        </div>
      </header>

      <UChatMessages
        :messages="messages"
        :status="status"
        :should-auto-scroll="true"
        :should-scroll-to-bottom="true"
        class="chat-messages"
        :assistant="{ variant: 'naked' }"
        :user="{ variant: 'soft' }"
      >
        <template #content="{ message }">
          <div class="message-content">
            <template v-for="(part, index) in message.parts" :key="message.id + '-' + index">
              <UChatReasoning
                v-if="isReasoningUIPart(part)"
                :text="part.text"
                :streaming="isStreamingPart(message, part)"
              >
                <Markdown :value="part.text" />
              </UChatReasoning>

              <Markdown
                v-else-if="isTextUIPart(part) && message.role === 'assistant'"
                :value="part.text"
              />

              <p
                v-else-if="isTextUIPart(part)"
                class="user-message-text"
              >
                {{ part.text }}
              </p>
            </template>

            <div
              v-if="message.role === 'assistant' && message.metadata?.durationMs !== undefined"
              class="message-metrics"
              aria-label="Показатели запроса"
            >
              <span>Вход: {{ formatMetric(message.metadata.usage?.inputTokens) }}</span>
              <span>Выход: {{ formatMetric(message.metadata.usage?.outputTokens) }}</span>
              <span>Всего: {{ formatMetric(message.metadata.usage?.totalTokens) }}</span>
              <span>Время: {{ (message.metadata.durationMs / 1000).toFixed(1) }} с</span>
              <span v-if="showRawFinishReason">
                rawFinishReason: {{ message.metadata.rawFinishReason ?? '—' }}
              </span>
            </div>
          </div>
        </template>
      </UChatMessages>

      <div v-if="error" class="chat-error" role="alert">
        <span>{{ error.message || 'Не удалось получить ответ модели.' }}</span>
        <UButton
          size="xs"
          color="error"
          variant="soft"
          @click="handleRegenerate"
        >
          Повторить
        </UButton>
      </div>

      <UChatPrompt
        v-model="input"
        class="chat-prompt"
        placeholder="Напишите сообщение…"
        :status="status"
        :disabled="isPromptDisabled"
        :error="error"
        @submit="handleSubmit"
      >
        <template #footer>
          <span class="prompt-hint">
            Enter — отправить · Shift+Enter — новая строка
          </span>
        </template>
        <UChatPromptSubmit
          :status="status"
          color="neutral"
          @stop="stop"
          @reload="handleRegenerate"
        />
      </UChatPrompt>
    </section>
  </main>
</template>

<style scoped>
.chat-shell {
  display: flex;
  min-height: 100dvh;
  background: var(--ui-bg);
}

.settings-sidebar {
  width: 3.5rem;
  flex: 0 0 3.5rem;
  border-right: 1px solid var(--ui-border);
  background: color-mix(in srgb, var(--ui-bg-muted) 72%, transparent);
  transition: width 180ms ease, flex-basis 180ms ease;
}

.settings-sidebar--open {
  width: 18rem;
  flex-basis: 18rem;
}

.settings-sidebar__top {
  display: flex;
  min-height: 4.5rem;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem;
  border-bottom: 1px solid var(--ui-border);
}

.settings-sidebar__title {
  color: var(--ui-text-highlighted);
  font-size: 0.95rem;
  font-weight: 700;
}

.prompt-hint {
  margin: 0;
  color: var(--ui-text-muted);
  font-size: 0.75rem;
  line-height: 1.4;
}

.chat-panel {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  padding: 0 1.25rem 1.25rem;
}

.chat-header {
  display: flex;
  min-height: 4.5rem;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border-bottom: 1px solid var(--ui-border);
}

.chat-header h1 {
  margin: 0;
  color: var(--ui-text-highlighted);
  font-size: clamp(1.15rem, 2vw, 1.45rem);
}

.chat-header__actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 0.5rem;
}

.chat-eyebrow {
  margin: 0 0 0.2rem;
  color: var(--ui-text-muted);
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.chat-messages {
  width: min(100%, 54rem);
  margin: 0 auto;
  padding: 1.5rem 0;
}

.message-content {
  display: grid;
  gap: 0.5rem;
}

.user-message-text {
  margin: 0;
  white-space: pre-wrap;
}

.message-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  color: var(--ui-text-muted);
  font-size: 0.7rem;
}

.chat-error {
  display: flex;
  width: min(100%, 54rem);
  box-sizing: border-box;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin: 0 auto 0.75rem;
  border: 1px solid color-mix(in srgb, var(--ui-error) 35%, transparent);
  border-radius: 0.75rem;
  padding: 0.75rem 1rem;
  color: var(--ui-error);
  font-size: 0.875rem;
}

.chat-prompt {
  width: min(100%, 54rem);
  margin: 0 auto;
}

.prompt-hint {
  padding: 0.25rem 0.25rem 0;
}

@media (max-width: 640px) {
  .chat-shell {
    position: relative;
  }

  .settings-sidebar {
    position: absolute;
    z-index: 10;
    inset: 0 auto 0 0;
    width: 3.5rem;
    min-height: 100%;
  }

  .settings-sidebar--open {
    width: min(18rem, calc(100vw - 3rem));
    box-shadow: 1rem 0 2rem rgb(15 23 42 / 18%);
  }

  .chat-panel {
    width: 100%;
    padding-right: 0.75rem;
    padding-left: 4.25rem;
  }

  .chat-header {
    min-height: 4rem;
  }

  .chat-error {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
