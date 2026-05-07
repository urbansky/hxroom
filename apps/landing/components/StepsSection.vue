<script setup lang="ts">
const steps = [
  {
    num: '01',
    title: 'Account erstellen',
    body: 'Kein Kreditkartenzwang. Trial startet sofort mit allen Features für 14 Tage.',
  },
  {
    num: '02',
    title: 'Branding einrichten',
    body: 'Logo hochladen, Farbe wählen, Sub-Domain konfigurieren – in wenigen Minuten.',
  },
  {
    num: '03',
    title: 'Verfügbarkeiten setzen',
    body: 'Wochentage und Zeiten freigeben. Buchungsseite ist sofort live und buchbar.',
  },
  {
    num: '04',
    title: 'Ersten Klienten einladen',
    body: 'Link verschicken. Klient bucht, zahlt, und erscheint pünktlich in deinem Raum.',
  },
];
</script>

<template>
  <section class="relative z-1 max-w-[1200px] mx-auto px-6 lg:px-12 py-20 lg:py-24">
    <!-- Eyebrow -->
    <div class="inline-flex items-center gap-2 mb-4">
      <div class="w-6 h-px bg-sage-500" />
      <span class="text-[10px] text-sage-500 tracking-[0.12em] uppercase">So funktioniert es</span>
    </div>

    <h2 class="font-serif text-4xl lg:text-[54px] font-light text-sage-950 dark:text-cream leading-[1.1] tracking-tight">
      In 15 Minuten<br><em class="italic text-gold-500 dark:text-gold-300">bereit für Klienten.</em>
    </h2>

    <!-- Steps Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-(--ui-border) border border-(--ui-border) rounded-2xl overflow-hidden mt-14">
      <div
        v-for="(step, i) in steps"
        :key="step.num"
        class="bg-(--ui-bg-elevated) p-7 lg:p-8 relative"
      >
        <div class="font-serif text-[56px] font-light text-sage-400/12 leading-none mb-4 tracking-tight">{{ step.num }}</div>
        <h3 class="font-serif text-lg text-sage-950 dark:text-cream mb-2.5">{{ step.title }}</h3>
        <p class="text-xs text-(--ui-text-muted) leading-[1.7]">{{ step.body }}</p>

        <!-- Arrow -->
        <div
          v-if="i < steps.length - 1"
          class="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 z-1 size-6 bg-(--ui-bg) border border-(--ui-border) rounded-full items-center justify-center"
        >
          <UIcon name="i-lucide-chevron-right" class="size-2.5 text-(--ui-text-dimmed)" />
        </div>
      </div>
    </div>
  </section>
</template>
