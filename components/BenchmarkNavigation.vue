<script setup lang="ts">
import { BENCHMARKS } from '~/shared/benchmarks'

const route = useRoute()
</script>

<template>
  <nav aria-label="Бенчмарки" class="md:border-r md:border-default md:pr-5">
    <p class="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Бенчмарки</p>
    <div class="flex gap-2 overflow-x-auto pb-1 md:flex-col md:overflow-visible md:pb-0">
      <NuxtLink
        v-for="benchmark in BENCHMARKS"
        :key="benchmark.id"
        :to="benchmark.path"
        :aria-current="route.path === benchmark.path ? 'page' : undefined"
        class="shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary md:shrink"
        :class="route.path === benchmark.path
          ? 'bg-primary/10 text-primary'
          : 'text-muted hover:bg-elevated hover:text-default'"
      >
        {{ benchmark.label }}
      </NuxtLink>
    </div>
  </nav>
</template>
