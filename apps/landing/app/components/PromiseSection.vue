<script setup lang="ts">
const content = {
  count: 'Die ersten 20 Coaches',
  headlineMain: 'Was',
  headlineEm: 'Early Access',
  headlineEnd: 'konkret bedeutet.',
  cards: [
    {
      num: '01',
      title: 'Launch-Preis auf Lebenszeit',
      text: 'Der Einführungspreis bleibt deiner – auch wenn HxRoom später teurer wird. Du bist dabei, solange du willst.',
    },
    {
      num: '02',
      title: 'Direkter Draht zur Entwicklung',
      text: 'Dein Feedback fließt direkt in das Produkt. Kein Ticket-System, keine Roadmap hinter Glas. Wir bauen das Ding gemeinsam.',
    },
    {
      num: '03',
      title: 'Erster Zugriff',
      text: 'Du nutzt HxRoom, bevor es öffentlich startet. Die Plattform wächst mit deinen ersten Klienten, nicht mit einer anonymen Nutzerwelle.',
    },
  ],
  cta: 'Mitgestalten statt zuschauen',
}
</script>

<template>
  <section class="relative z-1 py-[120px] px-12 bg-gradient-to-b from-transparent via-gold-400/3 to-transparent max-sm:py-20 max-sm:px-6">
    <div class="max-w-[920px] mx-auto text-center">
      <!-- Count -->
      <div class="font-serif text-[18px] text-gold-700 dark:text-gold-300 tracking-[0.1em] uppercase mb-[18px]">
        {{ content.count }}
      </div>

      <!-- Headline -->
      <h2 class="font-serif text-[clamp(40px,5vw,58px)] font-light leading-[1.1] text-(--color-cream) tracking-[-0.015em] mb-14">
        {{ content.headlineMain }} <em class="italic text-gold-700 dark:text-gold-300">{{ content.headlineEm }}</em> {{ content.headlineEnd }}
      </h2>

      <!-- Cards -->
      <div class="grid grid-cols-3 gap-6 text-left mb-14 max-md:grid-cols-1">
        <div
          v-for="card in content.cards"
          :key="card.num"
          class="bg-(--ui-bg-elevated) border border-gold-400/20 rounded-[14px] px-[26px] py-[30px]"
        >
          <div class="font-serif text-[14px] text-gold-400 tracking-[0.15em] mb-4">{{ card.num }}</div>
          <h3 class="font-serif text-[22px] text-(--color-cream) mb-3 leading-[1.25]">{{ card.title }}</h3>
          <p class="text-[14px] text-(--ui-text-muted) leading-[1.65]">{{ card.text }}</p>
        </div>
      </div>

      <!-- CTA -->
      <a href="#signup" class="promise-btn inline-flex items-center gap-2 no-underline">
        {{ content.cta }}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5"><path d="M5 12h14M13 5l7 7-7 7" /></svg>
      </a>
    </div>
  </section>
</template>

<style scoped>
.promise-btn {
  background: linear-gradient(135deg, var(--color-sage-600) 0%, #7a9079 100%);
  color: rgba(255, 255, 255, 0.95);
  border: none;
  border-radius: 10px;
  padding: 14px 28px;
  font-family: var(--font-sans);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}
.promise-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 30px rgba(92, 110, 91, 0.28); }
</style>
