<script setup lang="ts">
import type { ContentNavigationItem } from '@nuxt/content'

// Übersicht des Handbuchs: alle Abschnitte mit ihren Seiten, aus der Navigation gebaut.
definePageMeta({ layout: 'handbuch' })

const navigation = inject<Ref<ContentNavigationItem[]>>('handbuch-navigation', ref([]))

const title = 'Handbuch: Alle Funktionen von HxRoom erklärt'
const description = 'Wie HxRoom funktioniert: erste Schritte, Warteraum und Videocall, Datenschutz und Hilfe für Klienten – Schritt für Schritt mit Screenshots.'

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: 'website',
  ogUrl: 'https://hxroom.de/handbuch',
  ogSiteName: 'HxRoom',
  ogLocale: 'de_DE',
  twitterCard: 'summary_large_image',
})
// Strukturierte Daten: das Handbuch als Sammlung seiner Seiten (doc/marketing/handbuch.md §6.2).
const jsonLd = computed(() => JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  'name': 'HxRoom Handbuch',
  'description': description,
  'url': 'https://hxroom.de/handbuch',
  'inLanguage': 'de',
  'about': { '@type': 'SoftwareApplication', 'name': 'HxRoom', 'applicationCategory': 'BusinessApplication', 'operatingSystem': 'Web', 'url': 'https://hxroom.de' },
  'hasPart': navigation.value.flatMap(section => (section.children ?? []).map(child => ({
    '@type': 'TechArticle',
    'headline': child.title,
    'url': `https://hxroom.de${child.path}`,
  }))),
}))

useHead({
  link: [{ rel: 'canonical', href: 'https://hxroom.de/handbuch' }],
  script: [{ type: 'application/ld+json', textContent: jsonLd }],
})
</script>

<template>
  <UPage>
    <UPageHeader
      title="Handbuch"
      description="Hier steht, wie HxRoom funktioniert – für Coachs, die HxRoom einrichten und nutzen, und für Klienten, die zu einem Termin kommen."
    />

    <UPageBody>
      <section v-for="item in navigation" :key="item.path" class="mb-12">
        <NuxtLink :to="item.path" class="no-underline">
          <h2 class="flex items-center gap-2.5 font-serif text-3xl text-(--ui-text-highlighted) mb-1">
            <UIcon v-if="item.icon" :name="(item.icon as string)" class="size-5 text-primary" />
            {{ item.title }}
          </h2>
        </NuxtLink>
        <p v-if="item.description" class="text-(--ui-text-muted) mb-4">{{ item.description }}</p>
        <UPageGrid class="lg:grid-cols-2 xl:grid-cols-2">
          <UPageCard
            v-for="child in item.children ?? []"
            :key="child.path"
            :to="child.path"
            :title="child.title"
            :description="(child.description as string | undefined)"
          />
        </UPageGrid>
      </section>
    </UPageBody>
  </UPage>
</template>
