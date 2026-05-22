<script setup lang="ts">
const content = {
  label: 'Das Problem',
  headlineMain: 'Du verkaufst Vertrauen.',
  headlineEm: 'Dein Tool verkauft Firmen-Meeting.',
  lede: 'Coaches und Therapeuten schicken ihren Klienten heute einen Zoom- oder Meet-Link. Der erste Eindruck – der, der über Vertrauen entscheidet – ist damit aus der Hand gegeben.',
  cards: [
    { num: 'I.', text: 'Dein Klient bekommt einen Zoom-Link – und sieht das Branding einer fremden Firma, bevor er dich sieht.' },
    { num: 'II.', text: 'Er muss einen Account anlegen, eine App herunterladen, ein Update durchklicken – bevor das Gespräch beginnen kann.' },
    { num: 'III.', text: 'Der Raum, in dem ihr euch trefft, sieht aus wie ein Quartalsmeeting. Grau, funktional, unpersönlich.' },
  ],
  conclusion: 'Das ist nicht das Gefühl, das du verkaufst.',
}
</script>

<template>
  <section class="relative z-1 py-[120px] px-12 dark:bg-gradient-to-b dark:from-transparent dark:to-black/18 max-sm:py-20 max-sm:px-6">
    <div class="max-w-[1100px] mx-auto">
      <!-- Label -->
      <div class="flex items-center gap-2.5 mb-[18px] text-[11px] text-sage-600 dark:text-sage-200 tracking-[0.14em] uppercase">
        <span class="w-6 h-px bg-sage-400 shrink-0" />
        {{ content.label }}
      </div>

      <!-- Headline -->
      <h2 class="font-serif text-[clamp(36px,4.5vw,54px)] font-light leading-[1.1] text-(--color-cream) tracking-[-0.015em] max-w-[760px] mb-7">
        {{ content.headlineMain }}<br>
        <em class="italic text-gold-700 dark:text-gold-300">{{ content.headlineEm }}</em>
      </h2>

      <!-- Lede -->
      <p class="text-[17px] text-(--ui-text-muted) leading-[1.7] max-w-[640px]">
        {{ content.lede }}
      </p>

      <!-- Cards -->
      <div class="mt-14 grid grid-cols-3 gap-6 max-md:grid-cols-1">
        <div
          v-for="card in content.cards"
          :key="card.num"
          class="bg-(--ui-bg-elevated) border border-(--ui-border) rounded-[14px] p-7"
        >
          <div class="font-serif text-[32px] text-gold-400/50 italic leading-none mb-4">{{ card.num }}</div>
          <p class="text-[15px] text-(--ui-text) leading-[1.6]">{{ card.text }}</p>
        </div>
      </div>

      <!-- Conclusion -->
      <p class="mt-14 text-center font-serif text-[clamp(26px,3vw,36px)] italic text-gold-700 dark:text-gold-300 font-light">
        {{ content.conclusion }}
      </p>
    </div>
  </section>
</template>
