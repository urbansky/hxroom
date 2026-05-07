<script setup lang="ts">
const testimonials = [
  {
    text: '„Ich habe Zoom nie gemocht – es fühlte sich immer wie ein Firmenmeeting an. Seit HxRoom sagen meine Klienten beim ersten Call: das sieht wirklich professionell aus. Das hat meine Buchungsrate verändert."',
    name: 'Anna Bergmann',
    role: 'Life Coach · Berlin',
    initials: 'AB',
  },
  {
    text: '„Die DSGVO-Frage war bei mir immer im Kopf. Mit HxRoom kann ich meinen Klienten konkret sagen: deutsche Server, Auftragsverarbeitung geregelt. Das gibt mir Ruhe."',
    name: 'Markus Hoffmann',
    role: 'Business Coach · München',
    initials: 'MH',
  },
  {
    text: '„Buchung, Link, Erinnerung – alles automatisch. Ich spare jede Woche mindestens eine Stunde Organisationskram. Das Geld für Pro ist in der ersten Woche drin."',
    name: 'Sandra Kern',
    role: 'Life & Career Coach · Hamburg',
    initials: 'SK',
  },
];
</script>

<template>
  <div class="relative z-1 bg-white/[0.01] dark:bg-white/[0.01] border-y border-(--ui-border)" id="stimmen">
    <section class="max-w-[1200px] mx-auto px-6 lg:px-12 py-16 lg:py-20">
      <!-- Eyebrow -->
      <div class="inline-flex items-center gap-2 mb-4">
        <div class="w-6 h-px bg-sage-500" />
        <span class="text-[10px] text-sage-500 tracking-[0.12em] uppercase">Was Coaches sagen</span>
      </div>

      <h2 class="font-serif text-4xl lg:text-[54px] font-light text-sage-950 dark:text-cream leading-[1.1] tracking-tight">
        Echte <em class="italic text-gold-500 dark:text-gold-300">Stimmen.</em>
      </h2>

      <!-- Grid -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-14">
        <UCard v-for="t in testimonials" :key="t.name">
          <!-- Stars -->
          <div class="flex gap-0.5 mb-3.5">
            <UIcon v-for="i in 5" :key="i" name="i-lucide-star" class="size-3 text-gold-400" />
          </div>

          <!-- Text -->
          <p class="text-sm text-(--ui-text-muted) leading-[1.75] italic flex-1">{{ t.text }}</p>

          <!-- Author -->
          <div class="flex items-center gap-2.5 mt-3.5 pt-3.5 border-t border-(--ui-border)">
            <UAvatar :text="t.initials" size="sm" />
            <div>
              <div class="text-[13px] text-(--ui-text)">{{ t.name }}</div>
              <div class="text-[11px] text-(--ui-text-dimmed)">{{ t.role }}</div>
            </div>
          </div>
        </UCard>
      </div>
    </section>
  </div>
</template>
