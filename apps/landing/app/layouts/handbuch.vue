<script setup lang="ts">
import type { ContentNavigationItem } from '@nuxt/content'
import { Logo } from '@hxroom/ui'

// Gerüst des Handbuchs (doc/marketing/handbuch.md §3.2): links die Navigation über alle
// Abschnitte, in der Mitte die Seite, rechts deren Inhaltsverzeichnis (kommt aus der Seite).
// Unter `lg` liegt die Navigation in einem Slideover hinter dem Menüknopf.
const { demoUrl } = useLandingLinks()
const route = useRoute()

const { data: tree } = await useAsyncData('handbuch-navigation', () =>
  queryCollectionNavigation('handbuch', ['description']),
)

// Die Wurzel des Baums ist /handbuch selbst; Navigation und Übersicht zeigen ihre Abschnitte.
const navigation = computed<ContentNavigationItem[]>(() =>
  tree.value?.find(item => item.path === '/handbuch')?.children ?? [],
)
provide('handbuch-navigation', navigation)

// Suchindex erst im Browser: Er wird nur gebraucht, wenn jemand sucht.
const { data: searchFiles } = useLazyAsyncData('handbuch-search', () =>
  queryCollectionSearchSections('handbuch'), { server: false },
)

const menuOpen = ref(false)
watch(() => route.path, () => { menuOpen.value = false })
</script>

<template>
  <div class="bg-(--ui-bg) text-(--ui-text) min-h-screen antialiased [--ui-header-height:68px]">
    <header class="fixed top-0 inset-x-0 z-40 h-(--ui-header-height) flex items-center justify-between gap-4 px-4 sm:px-6 lg:px-12 bg-(--ui-bg)/75 backdrop-blur-xl border-b border-(--ui-border)">
      <div class="flex items-center gap-2 min-w-0">
        <UButton
          class="lg:hidden -ml-1.5"
          icon="i-lucide-menu"
          color="neutral"
          variant="ghost"
          aria-label="Navigation öffnen"
          @click="menuOpen = true"
        />
        <!-- Logo ist selbst ein Link auf „/“. -->
        <Logo class="no-underline" />
        <span class="hidden sm:block h-5 w-px bg-(--ui-border-accented) mx-2" aria-hidden="true" />
        <NuxtLink to="/handbuch" class="hidden sm:block text-sm text-(--ui-text-muted) hover:text-(--ui-text) transition-colors no-underline">
          Handbuch
        </NuxtLink>
      </div>

      <div class="flex items-center gap-2">
        <UContentSearchButton class="lg:w-48" :collapsed="false" label="Suchen" />
        <UButton
          :to="demoUrl"
          class="hidden md:inline-flex"
          color="primary"
          icon="i-lucide-calendar-heart"
          label="Vorführung buchen"
          @click="useTrackEvent('demo_click')"
        />
      </div>
    </header>

    <UMain class="relative z-1 pt-(--ui-header-height)">
      <UContainer>
        <UPage>
          <template #left>
            <UPageAside>
              <UContentNavigation :navigation="navigation" highlight />
            </UPageAside>
          </template>

          <slot />
        </UPage>
      </UContainer>
    </UMain>

    <SiteFooter />

    <USlideover v-model:open="menuOpen" side="left" title="Handbuch">
      <template #body>
        <!-- Der Link „Handbuch“ der Kopfleiste ist auf dem Handy ausgeblendet. -->
        <UButton to="/handbuch" label="Übersicht" icon="i-lucide-book-open" color="neutral" variant="ghost" class="mb-3 -ml-2.5" />
        <UContentNavigation :navigation="navigation" highlight />
      </template>
    </USlideover>

    <ClientOnly>
      <LazyUContentSearch
        :files="searchFiles ?? []"
        :navigation="navigation"
        placeholder="Im Handbuch suchen …"
        :color-mode="false"
      />
    </ClientOnly>
  </div>
</template>

<style scoped>
/* Überschriften im Stil der Landingpage */
:deep(h1),
:deep(.prose-h2),
:deep(article h2),
:deep(article h3) {
  font-family: var(--font-serif, Georgia, serif);
  font-weight: 400;
}
</style>
