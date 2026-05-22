<script setup lang="ts">
const content = {
  label: 'Die Idee',
  headlineMain: 'So fühlt sich ein',
  headlineEm: 'professioneller',
  headlineEnd: 'Coaching-Raum an.',
  lede: 'HxRoom ist kein Zoom-Ersatz. HxRoom ist der digitale Empfang, der Warteraum und der Gesprächsraum – in deinem Namen, in deinen Farben, mit deinem Gesicht.',
  cards: [
    {
      title: 'Vollständig dein Branding',
      text: 'Eigene Farben, eigenes Logo, eigenes Foto. Später auch eigene Domain. Deine Klienten sehen dich – nicht uns.',
      icon: 'globe',
    },
    {
      title: 'Buchung und Raum in einem',
      text: 'Klient bucht, bekommt Link, erscheint. Kein Account, kein Download, kein Setup. Ein Klick – und der Gesprächsraum öffnet sich.',
      icon: 'calendar',
    },
    {
      title: 'DSGVO ohne Grauzone',
      text: 'Server in Deutschland, AVV inklusive, keine Daten in die USA. Vertrauen als technisches Fundament, nicht als Marketing-Claim.',
      icon: 'shield',
    },
  ],
  disclaimer: 'Diese drei Dinge gibt es ab Launch. Weitere Funktionen – Sitzungsnotizen, automatische Erinnerungen, integrierte Bezahlung, KI-Zusammenfassung – folgen schrittweise danach.',
}
</script>

<template>
  <section class="relative z-1 pt-[100px] pb-[120px] px-12 max-sm:py-20 max-sm:px-6">
    <div class="max-w-[1100px] mx-auto">
      <!-- Label -->
      <div class="flex items-center gap-2.5 mb-[18px] text-[11px] text-sage-600 dark:text-sage-200 tracking-[0.14em] uppercase">
        <span class="w-6 h-px bg-sage-400 shrink-0" />
        {{ content.label }}
      </div>

      <!-- Headline -->
      <h2 class="font-serif text-[clamp(36px,4.5vw,54px)] font-light leading-[1.1] text-(--color-cream) tracking-[-0.015em] max-w-[760px] mb-7">
        {{ content.headlineMain }} <em class="italic text-gold-700 dark:text-gold-300">{{ content.headlineEm }}</em> {{ content.headlineEnd }}
      </h2>

      <!-- Lede -->
      <p class="text-[17px] text-(--ui-text-muted) leading-[1.7] max-w-[640px]">
        {{ content.lede }}
      </p>

      <!-- Cards -->
      <div class="mt-16 grid grid-cols-3 gap-5 max-md:grid-cols-1">
        <div
          v-for="card in content.cards"
          :key="card.title"
          class="vision-card bg-(--ui-bg-elevated) border border-(--ui-border) rounded-2xl p-9 relative overflow-hidden transition-all duration-250 hover:-translate-y-1 hover:border-sage-400/25"
        >
          <!-- Icon -->
          <div class="size-11 rounded-[11px] bg-sage-400/10 border border-sage-400/22 flex items-center justify-center mb-[22px]">
            <!-- Globe icon -->
            <svg v-if="card.icon === 'globe'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="size-5 text-sage-600 dark:text-sage-200"><circle cx="12" cy="12" r="9" /><path d="M12 3v18M3 12h18" /></svg>
            <!-- Calendar icon -->
            <svg v-else-if="card.icon === 'calendar'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="size-5 text-sage-600 dark:text-sage-200"><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 10h18M8 2v4M16 2v4" /></svg>
            <!-- Shield icon -->
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="size-5 text-sage-600 dark:text-sage-200"><path d="M12 3l8 4v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V7l8-4z" /><path d="M9 12l2 2 4-4" /></svg>
          </div>
          <h3 class="font-serif text-[24px] text-(--color-cream) mb-3 leading-[1.2]">{{ card.title }}</h3>
          <p class="text-[14px] text-(--ui-text-muted) leading-[1.65]">{{ card.text }}</p>
        </div>
      </div>

      <!-- Disclaimer -->
      <p class="mt-12 text-[13px] text-(--ui-text-dimmed) text-center italic py-[18px] px-6 bg-gold-400/4 border border-dashed border-gold-400/18 rounded-[10px] max-w-[720px] mx-auto">
        {{ content.disclaimer }}
      </p>
    </div>
  </section>
</template>
