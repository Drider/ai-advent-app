<script setup lang="ts">
defineProps<{
  title: string
  description?: string
}>()
</script>

<template>
  <div class="mx-auto max-w-7xl space-y-6 p-4">
    <div class="grid gap-6 md:grid-cols-[12rem_minmax(0,1fr)]">
      <BenchmarkNavigation />
      <main class="min-w-0 space-y-6">
        <div>
          <h1 class="text-lg font-semibold">{{ title }}</h1>
          <p v-if="description" class="mt-1 text-sm text-muted">{{ description }}</p>
        </div>
        <slot />
      </main>
    </div>
  </div>
</template>
