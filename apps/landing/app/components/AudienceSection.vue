<script setup lang="ts">
const content = {
  label: 'Für wen',
  headlineMain: 'Gebaut für',
  headlineEm: 'Solo-Coaches',
  headlineEnd: 'im DACH-Raum.',
  lede: 'HxRoom ist kein Allzweck-Werkzeug. Einzelgespräche statt Gruppen, ein ruhiger Raum statt Reactions und Aufnahmeknopf – bewusst so entschieden.',
  chips: [
    'Life Coaches',
    'Business Coaches',
    'Systemische Coaches',
    'Burnout-Begleiter:innen',
    'Heilpraktiker:innen',
    'Berater:innen',
  ],
  notForStrong: 'Nicht gemacht für:',
  notForRest: ' Konzern-Meetings, Webinare, Gruppen-Workshops. Wenn du einen Teams-Ersatz suchst, bist du hier falsch – und das ist Absicht.',
}
</script>

<template>
  <section id="fuer-wen" class="relative z-1 px-6 lg:px-12 py-[120px] max-sm:py-20 scroll-mt-16">
    <div class="max-w-[1180px] mx-auto grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-16 items-center max-lg:grid-cols-1 max-lg:gap-10">
      <div>
        <SectionLabel>{{ content.label }}</SectionLabel>
        <h2 class="font-serif text-[clamp(36px,4.5vw,54px)] font-light leading-[1.1] text-(--color-cream) tracking-[-0.015em] mb-6">
          {{ content.headlineMain }} <em class="italic text-gold-700 dark:text-gold-300">{{ content.headlineEm }}</em> {{ content.headlineEnd }}
        </h2>
        <p class="text-[17px] text-(--ui-text) opacity-85 leading-[1.7]">{{ content.lede }}</p>
      </div>

      <div>
        <ul class="flex flex-wrap gap-2.5">
          <li
            v-for="chip in content.chips"
            :key="chip"
            class="inline-flex items-center gap-2.5 rounded-full border border-(--ui-border) bg-(--ui-bg-elevated)/60 px-4 py-2.5 text-[15px] text-(--ui-text)"
          >
            <span class="size-1.5 rounded-full bg-sage-400 shrink-0" />
            {{ chip }}
          </li>
        </ul>

        <p class="mt-8 pl-5 border-l-2 border-gold-400/50 text-[15px] text-(--ui-text) opacity-85 leading-[1.65]">
          <strong class="font-medium">{{ content.notForStrong }}</strong>{{ content.notForRest }}
        </p>
      </div>
    </div>
  </section>
</template>
