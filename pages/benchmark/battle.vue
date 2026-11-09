<script setup lang="ts">
useSeoMeta({ title: 'LLM battle — Бенчмарки' })
</script>

<template>
  <BenchmarkShell
    title="LLM battle"
    description="Solar Mini 4, DeepSeek V4.1 Flash и Claude Opus 5.5: точность, время, токены и расчётная стоимость на одних задачах."
  >
    <BattleBenchmark />
  </BenchmarkShell>
</template>
