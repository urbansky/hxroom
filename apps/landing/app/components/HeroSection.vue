<script setup lang="ts">
const content = {
  eyebrow: 'Early Access · Launch Q4 2026',
  headlineMain: 'Dein Coaching. Dein Raum.',
  headlineEm: 'Dein Name.',
  sub: 'Ein gebrandeter Videocall-Raum für Coaches – ohne Zoom-Link, ohne Klienten-Account, ohne fremdes Logo. Gebaut in Deutschland, DSGVO-konform by Design.',
  cta: 'Early-Access-Platz sichern',
  fineprintStrong: 'Die ersten 20 Coaches',
  fineprintRest: ' bekommen Launch-Preis auf Lebenszeit, direkten Draht zur Entwicklung und ersten Zugriff.',
}
</script>

<template>
  <section id="top" class="relative z-1 min-h-[92vh] flex flex-col items-center justify-center text-center px-8 pt-[140px] pb-20 overflow-hidden">
    <!-- Eyebrow -->
    <div class="a1 inline-flex items-center gap-2.5 bg-gold-400/8 border border-gold-400/22 rounded-full px-[18px] py-[7px] mb-9">
      <span class="size-1.5 rounded-full bg-gold-400 shrink-0" />
      <span class="text-[11px] text-gold-300 tracking-[0.14em] uppercase">{{ content.eyebrow }}</span>
    </div>

    <!-- Headline -->
    <h1 class="a2 font-serif text-[clamp(48px,7vw,84px)] font-light leading-[1.04] text-(--color-cream) tracking-[-0.02em] max-w-[880px] mb-7">
      {{ content.headlineMain }} <em class="italic text-gold-300">{{ content.headlineEm }}</em>
    </h1>

    <!-- Sub -->
    <p class="a3 text-[18px] text-(--ui-text-muted) leading-[1.65] max-w-[560px] mb-12">
      {{ content.sub }}
    </p>

    <!-- Newsletter card -->
    <div class="a4 w-full flex justify-center mb-5">
      <NewsletterCard :cta="content.cta" source="landing" />
    </div>

    <!-- Fineprint -->
    <p class="a5 text-[12px] text-(--ui-text-dimmed) max-w-[460px] leading-[1.6]">
      <strong class="text-sage-200 font-medium">{{ content.fineprintStrong }}</strong>{{ content.fineprintRest }}
    </p>
  </section>
</template>

<style scoped>
.a1 { animation: fadeUp 0.7s ease both; }
.a2 { animation: fadeUp 0.7s 0.1s ease both; }
.a3 { animation: fadeUp 0.7s 0.2s ease both; }
.a4 { animation: fadeUp 0.7s 0.3s ease both; }
.a5 { animation: fadeUp 0.7s 0.4s ease both; }

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
