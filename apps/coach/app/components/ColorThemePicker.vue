<script setup lang="ts">
import { COLOR_THEMES, useColorTheme } from '~/composables/useColorTheme'

const { activeThemeId, selectTheme } = useColorTheme()
const open = ref(false)
const colorMode = useColorMode()
</script>

<template>
  <UModal v-model:open="open" :ui="{ width: 'sm:max-w-2xl' }">
    <UTooltip text="Farbschema wählen" :content="{ side: 'left' }">
      <UButton
        icon="i-lucide-palette"
        color="neutral"
        variant="ghost"
        size="sm"
        aria-label="Farbschema wählen"
      />
    </UTooltip>

    <template #content>
      <UCard :ui="{ body: 'p-6' }">
        <template #header>
          <div class="flex items-center gap-2 px-6 pt-5">
            <UIcon name="i-lucide-palette" class="text-primary size-5" />
            <h2 class="font-semibold text-highlighted text-base">Farbschema</h2>
          </div>
        </template>

        <p class="text-muted text-sm mb-5">
          Sidebar und Akzentfarben bleiben erhalten – nur Hintergrund und Karten-Hintergrund
          ändern sich.
        </p>

        <div class="grid grid-cols-3 gap-3">
          <button
            v-for="theme in COLOR_THEMES"
            :key="theme.id"
            class="group relative rounded-lg border-2 p-3 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            :class="activeThemeId === theme.id
              ? 'border-primary shadow-sm'
              : 'border-accented hover:border-primary/50'"
            @click="selectTheme(theme.id); open = false"
          >
            <!-- Mini-Vorschau -->
            <div
              class="mb-2.5 h-12 w-full rounded overflow-hidden flex shadow-xs border"
              :style="{ borderColor: 'rgba(0,0,0,0.06)', background: colorMode.value === 'dark' ? theme.dark.bg : theme.light.bg }"
            >
              <!-- Sidebar-Streifen -->
              <div class="w-6 h-full shrink-0 flex flex-col gap-1 p-1"
                :style="{ background: colorMode.value === 'dark' ? theme.dark.sidebarBg : theme.light.sidebarBg }"
              >
                <div class="h-1 rounded-full" style="background: var(--color-sage-600); width: 60%" />
                <div class="h-1 rounded-full opacity-40" :style="{ background: colorMode.value === 'dark' ? theme.dark.bgAccented : theme.light.bgAccented, width: '80%' }" />
                <div class="h-1 rounded-full opacity-40" :style="{ background: colorMode.value === 'dark' ? theme.dark.bgAccented : theme.light.bgAccented, width: '70%' }" />
              </div>
              <!-- Content-Bereich -->
              <div class="flex-1 p-1.5 flex flex-col gap-1">
                <!-- Card-Vorschau -->
                <div
                  class="flex-1 rounded"
                  :style="{ background: colorMode.value === 'dark' ? theme.dark.bgElevated : theme.light.bgElevated }"
                />
                <!-- Zweite Karte -->
                <div
                  class="h-2 rounded"
                  :style="{ background: colorMode.value === 'dark' ? theme.dark.bgAccented : theme.light.bgAccented }"
                />
              </div>
            </div>

            <!-- Label -->
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-highlighted">{{ theme.label }}</span>
              <UIcon
                v-if="activeThemeId === theme.id"
                name="i-lucide-check-circle-2"
                class="text-primary size-4 shrink-0"
              />
            </div>
            <p class="text-xs text-muted mt-0.5 leading-snug">{{ theme.description }}</p>
          </button>
        </div>

        <div class="mt-5 pt-4 border-t border-default flex items-center justify-between">
          <p class="text-xs text-dimmed">Auswahl wird lokal gespeichert</p>
          <UButton
            color="neutral"
            variant="ghost"
            size="xs"
            label="Schließen"
            @click="open = false"
          />
        </div>
      </UCard>
    </template>
  </UModal>
</template>
