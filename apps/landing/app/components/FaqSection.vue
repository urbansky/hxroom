<script setup lang="ts">
import { FAQ_ITEMS } from '~/utils/faq'

const content = {
  label: 'Häufige Fragen',
  headlineMain: 'Was du wahrscheinlich',
  headlineEm: 'zuerst',
  headlineEnd: 'wissen willst.',
}
</script>

<template>
  <section id="fragen" class="relative z-1 px-6 lg:px-12 py-[120px] max-sm:py-20 scroll-mt-16">
    <div class="max-w-[1180px] mx-auto grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-16 max-lg:grid-cols-1 max-lg:gap-10">
      <div>
        <SectionLabel>{{ content.label }}</SectionLabel>
        <h2 class="font-serif text-[clamp(36px,4.5vw,54px)] font-light leading-[1.1] text-(--color-cream) tracking-[-0.015em] lg:sticky lg:top-28">
          {{ content.headlineMain }} <em class="italic text-gold-700 dark:text-gold-300">{{ content.headlineEm }}</em> {{ content.headlineEnd }}
        </h2>
      </div>

      <div>
        <details
          v-for="item in FAQ_ITEMS"
          :key="item.q"
          class="faq-item border-b border-(--ui-border) py-6 first:pt-0"
        >
          <summary class="faq-summary font-serif text-[22px] text-(--color-cream) font-normal list-none cursor-pointer flex justify-between items-center gap-4 transition-colors">
            {{ item.q }}
            <span class="faq-icon text-[24px] text-sage-400 font-light shrink-0">+</span>
          </summary>
          <p class="mt-3.5 text-[16px] text-(--ui-text) opacity-85 leading-[1.7]">{{ item.a }}</p>
        </details>
      </div>
    </div>
  </section>
</template>

<style scoped>
.faq-item[open] .faq-summary { color: var(--color-gold-700); }
.faq-item[open] .faq-icon { transform: rotate(45deg); }
.faq-summary::-webkit-details-marker { display: none; }
.faq-icon { transition: transform 0.2s; display: inline-block; }
</style>

<style>
.dark .faq-item[open] .faq-summary { color: var(--color-gold-300); }
</style>
