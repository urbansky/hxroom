<script setup lang="ts">
const content = {
  headlineMain: 'Schau es dir an.',
  headlineEm: 'Oder leg direkt los.',
  sub: 'In 20 Minuten zeige ich dir HxRoom – oder du richtest dir deinen Raum gleich selbst ein. Fragen beantworte ich persönlich.',
  quote: '„Ich freue mich auf dein Feedback – jede Rückmeldung landet direkt bei mir.“',
  author: 'Stefan, baut HxRoom',
  newsletterSummary: 'Lieber erst mal Neuigkeiten?',
  newsletterCta: 'Neuigkeiten erhalten',
}
</script>

<template>
  <section class="relative z-1 px-6 lg:px-12 pt-[120px] pb-[100px] max-sm:py-20 text-center bg-(--ui-bg-muted)">
    <div class="max-w-[760px] mx-auto">
      <h2 class="font-serif text-[clamp(36px,4.8vw,56px)] font-light text-(--color-cream) leading-[1.1] tracking-[-0.015em] mb-5">
        {{ content.headlineMain }} <em class="italic text-gold-700 dark:text-gold-300 whitespace-nowrap">{{ content.headlineEm }}</em>
      </h2>
      <p class="text-[17px] text-(--ui-text) opacity-85 max-w-[540px] mx-auto mb-10 leading-[1.65]">
        {{ content.sub }}
      </p>

      <LandingCtas align="center" />

      <figure class="mt-14 inline-flex items-center gap-4 text-left max-sm:flex-col max-sm:text-center">
        <img src="/stefan.jpg" alt="" width="56" height="56" loading="lazy" class="size-14 rounded-full object-cover object-top shrink-0">
        <figcaption>
          <p class="font-serif text-[20px] italic text-(--color-cream) leading-[1.35]">{{ content.quote }}</p>
          <p class="mt-1 text-[13px] text-(--ui-text-muted)">{{ content.author }}</p>
        </figcaption>
      </figure>

      <details class="newsletter mt-16 border-t border-(--ui-border) pt-8">
        <summary class="list-none cursor-pointer inline-flex items-center gap-2 text-[14px] text-sage-700 dark:text-sage-200 hover:text-(--ui-text-highlighted) transition-colors">
          <UIcon name="i-lucide-mail" class="size-4" />
          {{ content.newsletterSummary }}
          <UIcon name="i-lucide-chevron-down" class="newsletter-chevron size-4 transition-transform" />
        </summary>
        <div class="mt-8 flex justify-center text-left">
          <NewsletterCard :cta="content.newsletterCta" />
        </div>
      </details>
    </div>
  </section>
</template>

<style scoped>
.newsletter summary::-webkit-details-marker { display: none; }
.newsletter[open] .newsletter-chevron { transform: rotate(180deg); }
</style>
