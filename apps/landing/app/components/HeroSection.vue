<script setup lang="ts">
const content = {
  eyebrow: 'Beta · jetzt kostenlos testen',
  // Je Satz ein Block, damit die Überschrift nur zwischen den Sätzen umbricht
  // (sonst landen „Dein“ und „Name.“ auf dem Handy in verschiedenen Zeilen).
  headline: ['Dein Coaching.', 'Dein Raum.'],
  headlineEm: 'Dein Name.',
  sub: 'Buchungsseite, Warteraum und Videocall unter deinem Namen – ohne Zoom-Link und ohne Konto für deine Klienten. Server in Deutschland, DSGVO-konform.',
  note: '20 Minuten mit Stefan – oder gleich selbst loslegen, ohne Kreditkarte.',
}
</script>

<template>
  <section id="top" class="relative z-1 px-6 lg:px-12 pt-[132px] pb-20 max-sm:pt-[104px] max-sm:pb-14 overflow-hidden">
    <div class="max-w-[1180px] mx-auto grid grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] gap-14 items-center max-lg:grid-cols-1 max-lg:gap-12">
      <div class="max-lg:text-center">
        <div class="a1 inline-flex items-center gap-2.5 bg-gold-400/8 border border-gold-400/22 rounded-full px-[18px] py-[7px] mb-8">
          <span class="size-1.5 rounded-full bg-gold-400 shrink-0 animate-pulse" />
          <span class="text-[11px] text-gold-700 dark:text-gold-300 tracking-[0.14em] uppercase">{{ content.eyebrow }}</span>
        </div>

        <h1 class="a2 font-serif text-[clamp(44px,5.6vw,76px)] font-light leading-[1.04] text-(--color-cream) tracking-[-0.02em] mb-6">
          <template v-for="part in content.headline" :key="part">
            <span class="whitespace-nowrap">{{ part }}</span>{{ ' ' }}
          </template>
          <em class="italic text-gold-700 dark:text-gold-300 whitespace-nowrap">{{ content.headlineEm }}</em>
        </h1>

        <p class="a3 text-[18px] text-(--ui-text) opacity-85 leading-[1.65] max-w-[520px] mb-9 max-lg:mx-auto max-sm:text-[17px]">
          {{ content.sub }}
        </p>

        <div class="a4">
          <LandingCtas class="max-lg:justify-center" />
          <p class="mt-4 text-[13px] text-(--ui-text-muted)">{{ content.note }}</p>
        </div>
      </div>

      <div class="a5">
        <ScreenFrame
          alt="Warteraum eines Coachs"
          address="demo.hxroom.de/call/…"
          eager
        />
      </div>
    </div>
  </section>
</template>

<style scoped>
.a1 { animation: fadeUp 0.7s ease both; }
.a2 { animation: fadeUp 0.7s 0.1s ease both; }
.a3 { animation: fadeUp 0.7s 0.2s ease both; }
.a4 { animation: fadeUp 0.7s 0.3s ease both; }
.a5 { animation: fadeUp 0.9s 0.35s ease both; }

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (prefers-reduced-motion: reduce) {
  .a1, .a2, .a3, .a4, .a5 { animation: none; }
}
</style>
