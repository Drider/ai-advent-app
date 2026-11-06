<script setup lang="ts">
import type { ReasoningEffort } from '~/shared/types/chat'

defineProps<{
  validationMessage: string
  modelValidationMessage: string
}>()

const modelId = defineModel<string>('modelId', { required: true })
const maxOutputTokensEnabled = defineModel<boolean>('maxOutputTokensEnabled', { required: true })
const maxOutputTokens = defineModel<number | null>('maxOutputTokens', { required: true })
const stopSequenceEnabled = defineModel<boolean>('stopSequenceEnabled', { required: true })
const stopSequence = defineModel<string>('stopSequence', { required: true })
const reasoningEnabled = defineModel<boolean>('reasoningEnabled', { required: true })
const reasoningEffort = defineModel<ReasoningEffort>('reasoningEffort', { required: true })
const responseSchemaEnabled = defineModel<boolean>('responseSchemaEnabled', { required: true })
const responseSchema = defineModel<string>('responseSchema', { required: true })
const showTokenBreakdown = defineModel<boolean>('showTokenBreakdown', { required: true })
const showRawFinishReason = defineModel<boolean>('showRawFinishReason', { required: true })
const preserveSettingsOnNewSession = defineModel<boolean>('preserveSettingsOnNewSession', { required: true })

const reasoningOptions: Array<{ label: string; value: ReasoningEffort }> = [
  { label: 'Low', value: 'low' },
  { label: 'High', value: 'high' },
  { label: 'Max', value: 'max' },
]
</script>

<template>
  <div class="chat-settings">
    <UFormField
      name="modelId"
      label="Модель"
      description="ID модели для следующего запроса."
      :error="modelValidationMessage || undefined"
    >
      <div class="settings-model">
        <UInput
          v-model="modelId"
          class="settings-input"
          placeholder="deepseek/deepseek-v4.1-flash"
          aria-label="ID модели"
          autocomplete="off"
          spellcheck="false"
        />
        <UButton
          to="https://polza.ai/dashboard/models"
          target="_blank"
          rel="noopener noreferrer"
          color="neutral"
          variant="soft"
          size="sm"
          square
          icon="i-lucide-external-link"
          aria-label="Открыть список моделей Polza"
          title="Список моделей Polza"
        />
      </div>
    </UFormField>

    <div class="settings-option">
      <UCheckbox
        v-model="reasoningEnabled"
        label="Рассуждения модели"
        color="primary"
      />

      <UFormField
        name="reasoningEffort"
        description="Уровень рассуждений: low, high или max. Работает, если модель поддерживает эту настройку."
      >
        <USelect
          v-model="reasoningEffort"
          :items="reasoningOptions"
          value-key="value"
          label-key="label"
          :disabled="!reasoningEnabled"
          class="settings-select"
          aria-label="Уровень рассуждений"
        />
      </UFormField>
    </div>

    <div class="settings-option">
      <UCheckbox
        v-model="maxOutputTokensEnabled"
        label="Максимум токенов ответа"
        color="primary"
      />

      <UFormField
        name="maxOutputTokens"
        description="Лимит передаётся модели, только когда включена галочка."
        :error="maxOutputTokensEnabled ? validationMessage || undefined : undefined"
      >
        <UInputNumber
          v-model="maxOutputTokens"
          :min="1"
          :step="1"
          :disabled="!maxOutputTokensEnabled"
          class="settings-number"
          aria-label="Лимит токенов ответа"
        >
          <template #decrement>
            <UButton
              color="neutral"
              variant="ghost"
              size="xs"
              square
              icon="i-lucide-minus"
              :disabled="!maxOutputTokensEnabled"
              aria-label="Уменьшить лимит токенов"
            />
          </template>
          <template #increment>
            <UButton
              color="neutral"
              variant="ghost"
              size="xs"
              square
              icon="i-lucide-plus"
              :disabled="!maxOutputTokensEnabled"
              aria-label="Увеличить лимит токенов"
            />
          </template>
        </UInputNumber>
      </UFormField>
    </div>

    <div class="settings-option">
      <UCheckbox
        v-model="stopSequenceEnabled"
        label="Stop sequence"
        color="primary"
      />

      <UFormField
        name="stopSequence"
        description="Остановить генерацию при появлении этой последовательности."
        :error="stopSequenceEnabled ? validationMessage || undefined : undefined"
      >
        <UInput
          v-model="stopSequence"
          :disabled="!stopSequenceEnabled"
          placeholder="Например, <END>"
          class="settings-input"
          aria-label="Stop sequence"
        />
      </UFormField>
    </div>

    <div class="settings-option">
      <UCheckbox
        v-model="responseSchemaEnabled"
        label="Структурированный ответ"
        color="primary"
      />

      <UFormField
        name="responseSchema"
        description="Модель вернёт JSON по этой схеме. Корень — object, все поля — required."
        :error="responseSchemaEnabled ? validationMessage || undefined : undefined"
      >
        <UTextarea
          v-model="responseSchema"
          :rows="12"
          :disabled="!responseSchemaEnabled"
          class="settings-textarea"
          spellcheck="false"
          aria-label="JSON Schema ответа"
        />
      </UFormField>
    </div>

    <UCheckbox
      v-model="showTokenBreakdown"
      label="Показывать разбивку токенов"
      description="Вход, кэш, текст ответа и рассуждения под каждым ответом."
      color="primary"
    />

    <UCheckbox
      v-model="showRawFinishReason"
      label="Показывать rawFinishReason"
      description="Причина завершения под каждым ответом."
      color="primary"
    />

    <UCheckbox
      v-model="preserveSettingsOnNewSession"
      label="Сохранять настройки при новой сессии"
      description="Параметры останутся прежними, а сайдбар не свернётся после сброса."
      color="primary"
    />
  </div>
</template>

<style scoped>
.chat-settings {
  display: grid;
  gap: 1.25rem;
  padding: 1.25rem;
}

.settings-option {
  display: grid;
  gap: 0.5rem;
}

.settings-number {
  width: 100%;
}

.settings-input {
  width: 100%;
}

.settings-model {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.settings-model .settings-input {
  min-width: 0;
  flex: 1;
}

.settings-textarea {
  width: 100%;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.75rem;
  line-height: 1.45;
}

.settings-select {
  width: 100%;
}
</style>
