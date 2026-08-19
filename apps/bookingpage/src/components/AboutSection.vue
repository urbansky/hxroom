<script setup lang="ts">
// Beispielinhalte: Zitat, Text und Qualifikationen sind Platzhalter, solange der
// öffentliche Endpunkt die vom Coach gepflegten Felder (tagline, bio) nicht ausliefert.
const credentials = [
  { icon: 'i-lucide-graduation-cap', text: 'ICF-zertifiziert (ACC) · International Coaching Federation' },
  { icon: 'i-lucide-clock', text: '8 Jahre Coaching-Erfahrung · 340+ begleitete Klienten' },
  { icon: 'i-lucide-users', text: 'Ausgebildet in systemischem Coaching & NLP' },
];
</script>

<template>
  <section id="about" class="relative max-w-[720px] mx-auto px-6 py-10 flex flex-col gap-8 scroll-mt-20">
    <h2 class="font-serif text-3xl text-highlighted">Über mich</h2>

    <blockquote class="border-l-2 border-primary pl-5 py-3 -mt-4 mb-0">
      <p class="font-serif text-xl italic text-highlighted leading-relaxed">
        „Klarheit entsteht nicht durch mehr Nachdenken – sondern durch andere Gespräche."
      </p>
    </blockquote>

    <div>
      <p class="text-base text-muted leading-loose mb-4">
        Ich bin Anna, zertifizierte Life & Business Coach aus Berlin. Nach zehn Jahren in der Unternehmensberatung habe ich gemerkt: Die wichtigsten Veränderungen in meinem Leben kamen nicht aus Strategiepapieren, sondern aus echten Gesprächen, die mich herausgefordert haben.
      </p>
      <p class="text-base text-muted leading-loose">
        Heute begleite ich Menschen, die an einem Wendepunkt stehen – die spüren, dass etwas nicht mehr stimmt, aber noch nicht wissen, wohin es gehen soll.
      </p>

      <div class="mt-7 flex flex-col gap-3">
        <div
          v-for="cred in credentials"
          :key="cred.text"
          class="flex items-center gap-4 p-4 rounded-xl border border-default bg-white dark:bg-neutral-900"
        >
          <div class="size-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
            <UIcon :name="cred.icon" class="size-5 text-primary" />
          </div>
          <span class="text-sm text-muted">{{ cred.text }}</span>
        </div>
      </div>
    </div>
  </section>
</template>
