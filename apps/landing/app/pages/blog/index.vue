<script setup lang="ts">
definePageMeta({ layout: 'blog' })

const { data: articles } = await useAsyncData('blog-list', () =>
  queryCollection('blog')
    .order('date', 'DESC')
    .all()
)

useHead({
  title: 'Blog · HxRoom',
  meta: [
    { name: 'description', content: 'Artikel und Einblicke rund um Coaching, DSGVO-konforme Tools und die Entstehung von HxRoom.' },
    { property: 'og:title', content: 'Blog · HxRoom' },
    { property: 'og:description', content: 'Artikel und Einblicke rund um Coaching, DSGVO-konforme Tools und die Entstehung von HxRoom.' },
    { property: 'og:type', content: 'website' },
  ],
  link: [
    { rel: 'alternate', type: 'application/rss+xml', title: 'HxRoom Blog RSS', href: '/blog/rss.xml' },
  ],
})
</script>

<template>
  <main class="relative z-1 pt-32 pb-24 px-6 lg:px-12 max-w-3xl mx-auto">
    <header class="mb-14">
      <p class="text-xs text-primary tracking-widest uppercase mb-3">Blog</p>
      <h1 class="font-serif text-4xl lg:text-5xl font-normal text-(--ui-text-highlighted) mb-4">
        Einblicke & Gedanken
      </h1>
      <p class="text-(--ui-text-muted) text-lg">
        Über Coaching, DSGVO-konforme Praxissoftware und was hinter HxRoom steckt.
      </p>
    </header>

    <ul v-if="articles?.length" class="space-y-10">
      <li v-for="article in articles" :key="article.path">
        <NuxtLink :to="article.path" class="group block no-underline">
          <article class="border border-(--ui-border) rounded-xl p-6 hover:border-primary/40 hover:bg-(--ui-bg-elevated) transition-all duration-200">
            <div class="flex items-center gap-3 mb-3">
              <time :datetime="article.date" class="text-xs text-(--ui-text-dimmed)">
                {{ new Date(article.date).toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' }) }}
              </time>
              <span v-if="article.category" class="text-xs text-primary bg-primary/8 px-2 py-0.5 rounded-full">
                {{ article.category }}
              </span>
            </div>
            <h2 class="font-serif text-2xl font-normal text-(--ui-text-highlighted) mb-2 group-hover:text-primary transition-colors">
              {{ article.title }}
            </h2>
            <p class="text-(--ui-text-muted) text-sm leading-relaxed">
              {{ article.description }}
            </p>
            <span class="inline-flex items-center gap-1.5 mt-4 text-sm text-primary">
              Weiterlesen
              <UIcon name="lucide:arrow-right" class="size-3.5" />
            </span>
          </article>
        </NuxtLink>
      </li>
    </ul>

    <p v-else class="text-(--ui-text-muted)">
      Noch keine Artikel vorhanden – bald mehr hier.
    </p>
  </main>
</template>
