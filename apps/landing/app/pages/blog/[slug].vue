<script setup lang="ts">
definePageMeta({ layout: 'blog' })

const route = useRoute()
const { data: article } = await useAsyncData(`blog-${route.params.slug}`, () =>
  queryCollection('blog')
    .where('draft', '<>', true)
    .path(`/blog/${route.params.slug}`)
    .first()
)

if (!article.value) {
  throw createError({ statusCode: 404, statusMessage: 'Artikel nicht gefunden' })
}

useHead({
  title: `${article.value.title} · HxRoom Blog`,
  meta: [
    { name: 'description', content: article.value.description },
    { property: 'og:title', content: `${article.value.title} · HxRoom Blog` },
    { property: 'og:description', content: article.value.description },
    { property: 'og:type', content: 'article' },
    ...(article.value.image ? [{ property: 'og:image', content: article.value.image }] : []),
  ],
  link: [
    { rel: 'alternate', type: 'application/rss+xml', title: 'HxRoom Blog RSS', href: '/blog/rss.xml' },
  ],
})
</script>

<template>
  <main class="relative z-1 pt-32 pb-24 px-6 lg:px-12 max-w-3xl mx-auto">
    <NuxtLink to="/blog" class="inline-flex items-center gap-1.5 text-sm text-(--ui-text-muted) hover:text-(--ui-text) transition-colors no-underline mb-10">
      <UIcon name="lucide:arrow-left" class="size-3.5" />
      Alle Artikel
    </NuxtLink>

    <article>
      <header class="mb-10">
        <div class="flex items-center gap-3 mb-4">
          <time v-if="article?.date" :datetime="article.date" class="text-xs text-(--ui-text-dimmed)">
            {{ new Date(article.date).toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' }) }}
          </time>
          <span v-if="article?.category" class="text-xs text-primary bg-primary/8 px-2 py-0.5 rounded-full">
            {{ article.category }}
          </span>
        </div>
        <h1 class="font-serif text-4xl lg:text-5xl font-normal text-(--ui-text-highlighted) mb-4 leading-tight">
          {{ article?.title }}
        </h1>
        <p class="text-(--ui-text-muted) text-lg mb-6">
          {{ article?.description }}
        </p>

        <div class="flex items-center gap-3 pt-6 border-t border-(--ui-border)">
          <img src="/stefan.jpg" alt="Stefan Urbansky" class="size-10 rounded-full object-cover object-top" />
          <div>
            <p class="text-sm font-medium text-(--ui-text-highlighted)">Stefan Urbansky</p>
            <p class="text-xs text-(--ui-text-dimmed)">Gründer, HxRoom</p>
          </div>
        </div>
      </header>

      <div class="prose prose-neutral dark:prose-invert max-w-none">
        <ContentRenderer v-if="article" :value="article" />
      </div>
    </article>
  </main>
</template>

<style>
/* Prose-Styling für Markdown-Inhalte */
.prose h2 {
  font-family: var(--font-serif, Georgia, serif);
  font-size: 1.5rem;
  font-weight: 400;
  color: var(--ui-text-highlighted);
  margin-top: 2.5rem;
  margin-bottom: 0.75rem;
}
.prose h3 {
  font-family: var(--font-serif, Georgia, serif);
  font-size: 1.25rem;
  font-weight: 400;
  color: var(--ui-text-highlighted);
  margin-top: 2rem;
  margin-bottom: 0.5rem;
}
.prose p {
  color: var(--ui-text-muted);
  line-height: 1.8;
  margin-bottom: 1.25rem;
}
.prose a {
  color: var(--ui-primary);
  text-decoration: underline;
  text-decoration-color: color-mix(in srgb, var(--ui-primary) 40%, transparent);
}
.prose a:hover {
  text-decoration-color: var(--ui-primary);
}
.prose strong {
  color: var(--ui-text-highlighted);
  font-weight: 600;
}
.prose ul {
  color: var(--ui-text-muted);
  padding-left: 1.5rem;
  margin-bottom: 1.25rem;
  list-style-type: disc;
}
.prose ol {
  color: var(--ui-text-muted);
  padding-left: 1.5rem;
  margin-bottom: 1.25rem;
  list-style-type: decimal;
}
.prose li {
  line-height: 1.75;
  margin-bottom: 0.35rem;
}
.prose blockquote {
  border-left: 3px solid var(--ui-primary);
  padding-left: 1.25rem;
  margin-left: 0;
  color: var(--ui-text-muted);
  font-style: italic;
}
.prose code {
  background: var(--ui-bg-elevated);
  border: 1px solid var(--ui-border);
  border-radius: 4px;
  padding: 0.15em 0.4em;
  font-size: 0.875em;
}
.prose pre {
  background: var(--ui-bg-elevated);
  border: 1px solid var(--ui-border);
  border-radius: 8px;
  padding: 1.25rem;
  overflow-x: auto;
  margin-bottom: 1.25rem;
}
.prose pre code {
  background: none;
  border: none;
  padding: 0;
  font-size: 0.875em;
}
.prose hr {
  border-color: var(--ui-border);
  margin: 2.5rem 0;
}
</style>
