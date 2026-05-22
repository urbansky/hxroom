<script setup lang="ts">
const content = {
  label: 'Für wen',
  headlineMain: 'Gebaut für',
  headlineEm: 'Solo-Coaches',
  headlineEnd: 'im DACH-Markt.',
  lede: 'HxRoom ist kein Allzweck-Werkzeug. Die Entscheidungen – 1:1 statt Gruppe, kein Chat, keine Reactions, kein Recording per Default – sind bewusst getroffen, um einen ruhigen, persönlichen Gesprächsraum zu ermöglichen.',
  chips: [
    'Life Coaches',
    'Business Coaches',
    'Burnout-Begleiter',
    'Heilpraktiker:innen',
    'Berater:innen',
    'Systemische Coaches',
  ],
  notForStrong: 'Nicht gemacht für:',
  notForRest: ' Konzern-Meetings, Webinare, Gruppen-Workshops, Webinar-Funnels. Wenn du Teams-Ersatz suchst, bist du hier falsch – und das ist volle Absicht.',
}
</script>

<template>
  <section class="relative z-1 py-[120px] px-12 dark:bg-gradient-to-b dark:from-transparent dark:to-black/15 max-sm:py-20 max-sm:px-6">
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

      <!-- Chips -->
      <div class="mt-12 grid gap-3.5" style="grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));">
        <div
          v-for="chip in content.chips"
          :key="chip"
          class="bg-(--ui-bg-elevated) border border-(--ui-border) rounded-[10px] px-[22px] py-[18px] flex items-center gap-3"
        >
          <span class="size-2 rounded-full bg-sage-400 shrink-0" />
          <span class="text-[14px] text-(--ui-text)">{{ chip }}</span>
        </div>
      </div>

      <!-- Not for -->
      <div class="mt-10 py-5 px-6 bg-white/2 border-l-2 border-gold-400/40 rounded-sm text-[14px] text-(--ui-text-muted) leading-[1.6] italic">
        <strong class="text-(--ui-text) not-italic font-medium">{{ content.notForStrong }}</strong>{{ content.notForRest }}
      </div>
    </div>
  </section>
</template>
