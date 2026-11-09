<script setup lang="ts">
const route = useRoute()

const links = [
  { to: '/', label: 'Чат', icon: 'i-lucide-message-circle', section: 'chat' },
  { to: '/benchmark', label: 'Бенчмарки', icon: 'i-lucide-flask-conical', section: 'benchmarks' },
  { to: '/benchmark/reports', label: 'Отчёты', icon: 'i-lucide-file-text', section: 'reports' },
] as const

const activeSection = computed(() => {
  if (route.path.startsWith('/benchmark/reports')) return 'reports'
  if (route.path.startsWith('/benchmark')) return 'benchmarks'
  return 'chat'
})
</script>

<template>
  <header class="app-navigation">
    <div class="app-navigation__brand-group">
      <span class="app-navigation__brand">LLM Lab</span>
      <UColorModeButton
        color="neutral"
        variant="ghost"
        size="sm"
        class="app-navigation__theme"
        aria-label="Переключить тему"
        title="Переключить тему"
      />
    </div>
    <nav aria-label="Основная навигация" class="app-navigation__links">
      <NuxtLink
        v-for="link in links"
        :key="link.section"
        :to="link.to"
        :aria-current="route.path === link.to ? 'page' : undefined"
        class="app-navigation__link"
        :class="{ 'app-navigation__link--active': activeSection === link.section }"
      >
        <UIcon :name="link.icon" aria-hidden="true" class="app-navigation__icon" />
        {{ link.label }}
      </NuxtLink>
    </nav>
  </header>
</template>

<style scoped>
.app-navigation {
  position: sticky;
  z-index: 20;
  top: 0;
  display: flex;
  box-sizing: border-box;
  height: 3.5rem;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border-bottom: 1px solid var(--ui-border);
  padding: 0 1rem;
  background: var(--ui-bg);
}

.app-navigation__brand {
  flex-shrink: 0;
  color: var(--ui-text-highlighted);
  font-size: 0.875rem;
  font-weight: 700;
}

.app-navigation__brand-group {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 0.5rem;
}

.app-navigation__links {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.app-navigation__theme {
  flex-shrink: 0;
}

.app-navigation__link {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  border-radius: 0.5rem;
  padding: 0.4rem 0.75rem;
  color: var(--ui-text-muted);
  font-size: 0.875rem;
  font-weight: 500;
  white-space: nowrap;
  transition: background-color 150ms ease, color 150ms ease;
}

.app-navigation__icon {
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
}

.app-navigation__link:hover {
  background: var(--ui-bg-elevated);
  color: var(--ui-text-highlighted);
}

.app-navigation__link:focus-visible {
  outline: 2px solid var(--ui-primary);
  outline-offset: 2px;
}

.app-navigation__link--active {
  background: color-mix(in srgb, var(--ui-primary) 12%, transparent);
  color: var(--ui-primary);
}

@media (max-width: 640px) {
  .app-navigation__brand {
    display: none;
  }

  .app-navigation__links {
    min-width: 0;
    justify-content: flex-end;
    gap: 0.125rem;
  }

  .app-navigation__link {
    gap: 0.3rem;
    padding-inline: 0.4rem;
  }
}
</style>
