<script setup lang="ts">
useSeoMeta({ title: 'LLM temperature — Бенчмарки' })
</script>

<template>
  <BenchmarkShell
    title="LLM temperature"
    description="Два одинаковых запроса при temperature 0, 0.7 и 1.2 — по пять ответов для каждой комбинации."
  >
    <TemperatureBenchmark />
  </BenchmarkShell>
</template>
