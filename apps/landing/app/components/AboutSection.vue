<script setup lang="ts">
const content = {
  label: 'Wer das baut',
  initial: 'S',
  headline: 'Ein Entwickler. Kein Startup-Theater.',
  paragraphs: [
    'Ich bin <strong>Stefan</strong>. Als selbständiger Softwareentwickler arbeite ich seit Jahren an Videoconferencing-Systemen – und habe gesehen, was passiert, wenn Tools für Konzerne gebaut werden und dann in einem 1:1-Coaching-Setting landen.',
    'HxRoom baue ich als Einzelperson. Kein Investor, kein Pitch Deck, keine Wachstumsrunde. Nur ein Produkt, das genau eine Zielgruppe richtig bedienen will. <strong>Server in Deutschland, Daten bleiben hier</strong>, und wenn du mir schreibst, schreibe ich zurück – keine Support-Pipeline dazwischen.',
  ],
  links: [
    { label: 'LinkedIn', href: '#' },
    { label: 'hxcode.io', href: '#' },
    { label: 'stefan@hxroom.de', href: 'mailto:stefan@hxroom.de' },
  ],
}
</script>

<template>
  <section class="relative z-1 py-[120px] px-12 max-sm:py-20 max-sm:px-6">
    <div class="about-inner max-w-[780px] mx-auto grid gap-12 items-center" style="grid-template-columns: 160px 1fr;">
      <!-- Photo -->
      <div class="about-photo size-[160px] rounded-full flex items-center justify-center font-serif text-[52px] text-white/88 shrink-0">
        {{ content.initial }}
      </div>

      <!-- Body -->
      <div>
        <div class="flex items-center gap-2.5 mb-3.5 text-[11px] text-sage-200 tracking-[0.14em] uppercase">
          <span class="w-6 h-px bg-sage-400 shrink-0" />
          {{ content.label }}
        </div>
        <h2 class="font-serif text-[36px] font-light text-(--color-cream) leading-[1.15] mb-5">{{ content.headline }}</h2>
        <p
          v-for="(p, i) in content.paragraphs"
          :key="i"
          class="text-[15px] text-(--ui-text-muted) leading-[1.75] mb-[18px] [&_strong]:text-(--ui-text) [&_strong]:font-medium"
          v-html="p"
        />
        <div class="flex gap-[18px] mt-5">
          <a
            v-for="link in content.links"
            :key="link.label"
            :href="link.href"
            class="text-[13px] text-sage-200 no-underline border-b border-sage-400/30 pb-0.5 transition-colors hover:border-sage-400"
          >
            {{ link.label }}
          </a>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.about-photo {
  background: linear-gradient(135deg, var(--color-gold-400) 0%, var(--color-gold-300) 50%, var(--color-sage-400) 100%);
  border: 3px solid rgba(255, 255, 255, 0.06);
}

@media (max-width: 640px) {
  .about-inner {
    grid-template-columns: 1fr !important;
    text-align: center;
  }
  .about-photo {
    margin: 0 auto;
  }
}
</style>
