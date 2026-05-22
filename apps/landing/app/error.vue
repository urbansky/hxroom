<script setup lang="ts">
const error = useError()
const is404 = computed(() => error.value?.statusCode === 404)

useHead({
  htmlAttrs: { lang: 'de' },
  meta: [{ name: 'robots', content: 'noindex, follow' }],
})
</script>

<template>
  <UApp>
    <div class="bg-(--ui-bg) text-(--ui-text) min-h-screen antialiased flex flex-col items-center justify-center px-6 text-center">
      <NuxtLink to="/" class="flex items-center gap-2.5 no-underline mb-16">
        <div class="size-9 rounded-[10px] bg-gradient-to-br from-sage-400 to-sage-600 flex items-center justify-center text-lg text-white/92 font-semibold shrink-0">
          Hx
        </div>
        <span class="text-[22px] text-gold-700 dark:text-gold-200 tracking-wide">Room</span>
      </NuxtLink>

      <p class="font-serif text-[100px] font-light text-sage-400/20 leading-none mb-6 tracking-tight">
        {{ is404 ? '404' : error?.statusCode ?? '?' }}
      </p>

      <h1 class="font-serif text-[clamp(28px,4vw,42px)] font-light text-(--color-cream) leading-[1.2] mb-4">
        {{ is404 ? 'Seite nicht gefunden.' : 'Ein Fehler ist aufgetreten.' }}
      </h1>
      <p class="text-[15px] text-(--ui-text-muted) max-w-[400px] leading-[1.65] mb-10">
        {{ is404
          ? 'Diese Seite existiert nicht. Vielleicht ein veralteter Link?'
          : 'Bitte versuche es in einem Moment erneut.' }}
      </p>

      <UButton to="/" color="primary" variant="outline" size="lg">
        Zur Startseite
      </UButton>
    </div>
  </UApp>
</template>
