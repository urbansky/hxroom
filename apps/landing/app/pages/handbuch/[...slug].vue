<script setup lang="ts">
import type { ContentNavigationItem } from '@nuxt/content'

// Eine Seite des Handbuchs oder die Übersicht eines Abschnitts (/handbuch/videocall).
// Abschnitte haben keine eigene Markdown-Datei; ihre Seite entsteht aus der Navigation.
// Aufbau einer Seite: doc/marketing/handbuch.md §5.
definePageMeta({ layout: 'handbuch' })

const route = useRoute()
const path = route.path.replace(/\/$/, '')
const navigation = inject<Ref<ContentNavigationItem[]>>('handbuch-navigation', ref([]))
const { registerUrl, demoUrl } = useLandingLinks()

const { data: page } = await useAsyncData(`handbuch-${path}`, () =>
  queryCollection('handbuch').path(path).first(),
)

const section = computed(() => {
  const segment = path.split('/')[2]
  return navigation.value.find(item => item.path === `/handbuch/${segment}`)
})
const isSection = computed(() => !page.value && section.value?.path === path)

if (!page.value && !isSection.value) {
  throw createError({ statusCode: 404, statusMessage: 'Seite nicht gefunden', fatal: true })
}

const { data: surround } = await useAsyncData(`handbuch-surround-${path}`, () =>
  queryCollectionItemSurroundings('handbuch', path, { fields: ['description'] }),
)

const { data: related } = await useAsyncData(`handbuch-related-${path}`, async () => {
  const paths = page.value?.related?.map(p => `/handbuch/${p}`) ?? []
  if (!paths.length) return []
  return queryCollection('handbuch').where('path', 'IN', paths).select('path', 'title', 'description').all()
})

const title = computed(() => page.value?.title ?? section.value?.title ?? '')
const description = computed(() => page.value?.description ?? (section.value?.description as string | undefined) ?? '')

// Ohne die Seite selbst: Ihr Titel steht direkt darunter, und auf dem Handy reicht die
// Breite sonst nicht für drei Stufen.
const breadcrumb = computed(() => [
  { label: 'Handbuch', to: '/handbuch' },
  ...(section.value && !isSection.value ? [{ label: section.value.title, to: section.value.path }] : []),
])

const tocLinks = computed(() => {
  const links = [...(page.value?.body?.toc?.links ?? [])]
  if (page.value?.faq?.length) links.push({ id: 'haeufige-fragen', depth: 2, text: 'Häufige Fragen' })
  return links
})

const faqItems = computed(() => page.value?.faq?.map(item => ({ label: item.q, content: item.a })) ?? [])

const updated = computed(() => page.value?.updated
  ? new Date(page.value.updated).toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' })
  : null)

const seoTitle = page.value?.seoTitle ?? `${title.value} – HxRoom Handbuch`
const url = `https://hxroom.de${path}`
useSeoMeta({
  title: seoTitle,
  description: description.value,
  ogTitle: seoTitle,
  ogDescription: description.value,
  ogType: 'article',
  ogUrl: url,
  ogSiteName: 'HxRoom',
  ogLocale: 'de_DE',
  twitterCard: 'summary_large_image',
})
// Strukturierte Daten (doc/marketing/handbuch.md §6.2): die Seite als Anleitung zu HxRoom,
// ihr Platz im Handbuch und, wo vorhanden, die häufigen Fragen.
const crumbs = [
  { name: 'Handbuch', url: 'https://hxroom.de/handbuch' },
  ...(section.value && !isSection.value ? [{ name: section.value.title, url: `https://hxroom.de${section.value.path}` }] : []),
  { name: title.value, url },
]
const graph: Record<string, unknown>[] = [
  {
    '@type': 'BreadcrumbList',
    'itemListElement': crumbs.map((crumb, i) => ({ '@type': 'ListItem', 'position': i + 1, 'name': crumb.name, 'item': crumb.url })),
  },
]
if (page.value) {
  graph.push({
    '@type': 'TechArticle',
    'headline': page.value.title,
    'description': description.value,
    'url': url,
    'inLanguage': 'de',
    ...(page.value.updated ? { dateModified: page.value.updated } : {}),
    'author': { '@type': 'Organization', 'name': 'HxRoom', 'url': 'https://hxroom.de' },
    'publisher': { '@type': 'Organization', 'name': 'HxRoom', 'url': 'https://hxroom.de' },
    'about': { '@type': 'SoftwareApplication', 'name': 'HxRoom', 'applicationCategory': 'BusinessApplication', 'operatingSystem': 'Web', 'url': 'https://hxroom.de' },
    'isPartOf': { '@type': 'CollectionPage', 'name': 'HxRoom Handbuch', 'url': 'https://hxroom.de/handbuch' },
  })
  if (page.value.faq?.length) {
    graph.push({
      '@type': 'FAQPage',
      'mainEntity': page.value.faq.map(item => ({ '@type': 'Question', 'name': item.q, 'acceptedAnswer': { '@type': 'Answer', 'text': item.a } })),
    })
  }
}
else {
  graph.push({ '@type': 'CollectionPage', 'name': title.value, 'description': description.value, 'url': url, 'inLanguage': 'de' })
}

useHead({
  link: [
    { rel: 'canonical', href: url },
    // Dieselbe Seite als Markdown für KI-Agenten (server/middleware/handbuch-markdown.ts)
    ...(page.value ? [{ rel: 'alternate', type: 'text/markdown', href: `${path}.md` }] : []),
  ],
  script: [{ type: 'application/ld+json', textContent: JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }) }],
})
</script>

<template>
  <UPage>
    <UPageHeader :title="title" :description="description">
      <template #headline>
        <UBreadcrumb :items="breadcrumb" />
      </template>
    </UPageHeader>

    <UPageBody>
      <!-- Abschnitt: seine Seiten als Karten -->
      <UPageGrid v-if="isSection" class="lg:grid-cols-2 xl:grid-cols-2">
        <UPageCard
          v-for="item in section?.children ?? []"
          :key="item.path"
          :to="item.path"
          :title="item.title"
          :description="(item.description as string | undefined)"
        />
      </UPageGrid>

      <article v-else-if="page">
        <UAlert
          v-if="page.menu"
          icon="i-lucide-mouse-pointer-click"
          color="neutral"
          variant="subtle"
          title="Wo in HxRoom"
          :description="page.menu"
          class="mb-8"
        />

        <ContentRenderer :value="page" />

        <section v-if="faqItems.length" class="mt-12">
          <h2 id="haeufige-fragen" class="text-2xl text-(--ui-text-highlighted) mb-4">Häufige Fragen</h2>
          <!-- Antworten bleiben im HTML (unmount-on-hide aus), damit Crawler sie lesen. -->
          <UAccordion :items="faqItems" type="multiple" :unmount-on-hide="false" />
        </section>

        <section v-if="related?.length" class="mt-12">
          <h2 class="text-2xl text-(--ui-text-highlighted) mb-4">Weiterlesen</h2>
          <UPageGrid class="lg:grid-cols-2 xl:grid-cols-2">
            <UPageCard v-for="item in related" :key="item.path" :to="item.path" :title="item.title" :description="item.description" />
          </UPageGrid>
        </section>

        <!-- Richtet sich an Coachs; auf den Seiten für Klienten wäre er fehl am Platz. -->
        <UPageCTA
          v-if="page.audience !== 'klient'"
          class="mt-12"
          variant="subtle"
          title="Selbst ausprobieren"
          description="HxRoom ist in der Beta kostenlos. Oder du lässt es dir in 15 Minuten zeigen."
          :links="[
            { label: 'Kostenlos ausprobieren', to: registerUrl, icon: 'i-lucide-arrow-right', trailing: true },
            { label: 'Vorführung buchen', to: demoUrl, color: 'neutral', variant: 'outline' },
          ]"
        />

        <p v-if="updated" class="mt-8 text-xs text-(--ui-text-dimmed)">
          Stand: {{ updated }}
        </p>
      </article>

      <!-- Die Nachbarn kommen als [vorher, nachher], jeweils null am Rand. -->
      <template v-if="surround?.some(Boolean)">
        <USeparator class="my-10" />
        <UContentSurround :surround="surround" />
      </template>
    </UPageBody>

    <template v-if="tocLinks.length" #right>
      <UContentToc :links="tocLinks" highlight />
    </template>
  </UPage>
</template>
