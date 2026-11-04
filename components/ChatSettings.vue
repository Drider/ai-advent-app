<script setup lang="ts">
defineProps<{
  validationMessage: string
}>()

const maxOutputTokensEnabled = defineModel<boolean>('maxOutputTokensEnabled', { required: true })
const maxOutputTokens = defineModel<number | null>('maxOutputTokens', { required: true })
const showRawFinishReason = defineModel<boolean>('showRawFinishReason', { required: true })
</script>

<template>
  <div class="chat-settings">
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

    <UCheckbox
      v-model="showRawFinishReason"
      label="Показывать rawFinishReason"
      description="Причина завершения под каждым ответом."
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
</style>
