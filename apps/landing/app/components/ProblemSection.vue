<script setup lang="ts">
const content = {
  label: 'Das Problem',
  headlineMain: 'Du verkaufst Vertrauen.',
  headlineEm: 'Dein Tool verkauft',
  // Eigener Block, damit nicht am Bindestrich umbrochen wird.
  headlineEmEnd: 'Firmen-Meeting.',
  lede: 'Der Termin kommt über Calendly, der Link über Zoom, die Erinnerung schreibst du von Hand. Dein Klient sieht dabei das Logo fremder Firmen, legt vielleicht noch ein Konto an – und landet in einem Raum, der aussieht wie ein Quartalsmeeting. Der erste Eindruck ist weg, bevor du Hallo gesagt hast.',
  conclusion: 'Das ist nicht das Gefühl, das du verkaufst.',
}
</script>

<template>
  <section class="relative z-1 px-6 lg:px-12 py-[110px] max-sm:py-20 bg-sage-900 dark:bg-sage-900/55 dark:border-y dark:border-sage-800/60">
    <div class="max-w-[1180px] mx-auto grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-16 items-end max-lg:grid-cols-1 max-lg:gap-8">
      <div>
        <SectionLabel inverted>{{ content.label }}</SectionLabel>
        <h2 class="font-serif text-[clamp(36px,4.6vw,58px)] font-light leading-[1.08] tracking-[-0.015em] text-[#F5F0E8]">
          {{ content.headlineMain }}<br>
          <em class="italic text-gold-300">{{ content.headlineEm }} <span class="whitespace-nowrap">{{ content.headlineEmEnd }}</span></em>
        </h2>
      </div>
      <div>
        <p class="text-[17px] leading-[1.75] text-[#F5F0E8]/80">
          {{ content.lede }}
        </p>
        <p class="mt-6 font-serif text-[clamp(22px,2.4vw,28px)] italic font-light text-gold-200">
          {{ content.conclusion }}
        </p>
      </div>
    </div>
  </section>
</template>
