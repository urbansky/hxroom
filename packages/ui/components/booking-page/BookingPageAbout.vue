<script setup lang="ts">
import { computed } from 'vue'
import type { BookingPageProfile } from '@hxroom/shared'

// Abschnitt „Über mich“. Wird nur eingebunden, wenn mindestens eines der drei Felder gefüllt
// ist (hasBookingPageAbout).
const { profile } = defineProps<{ profile: Pick<BookingPageProfile, 'bio' | 'quote' | 'qualifications'> }>()

// Leerzeilen im Text des Coachs trennen Absätze, einfache Umbrüche bleiben innerhalb eines Absatzes.
const bioParagraphs = computed(() =>
  (profile.bio ?? '').split(/\n\s*\n/).map(p => p.trim()).filter(Boolean),
)

// Die Anführungszeichen setzt die Seite selbst; tippt der Coach eigene mit, stünden sie sonst doppelt da.
const quote = computed(() => (profile.quote ?? '').trim().replace(/^["'„“”‚‘»«]+|["'„“”‚‘»«]+$/g, '').trim())
</script>

<template>
  <section id="about" class="relative max-w-[720px] mx-auto px-6 py-10 flex flex-col gap-8 scroll-mt-20">
    <h2 class="font-serif text-3xl text-highlighted">Über mich</h2>

    <blockquote v-if="quote" class="border-l-2 border-primary pl-5 py-3 -mt-4 mb-0">
      <p class="font-serif text-xl italic text-highlighted leading-relaxed">
        „{{ quote }}“
      </p>
    </blockquote>

    <div v-if="bioParagraphs.length || profile.qualifications.length" class="flex flex-col gap-7">
      <div v-if="bioParagraphs.length" class="flex flex-col gap-4">
        <p v-for="(paragraph, i) in bioParagraphs" :key="i" class="text-base text-muted leading-loose whitespace-pre-line">
          {{ paragraph }}
        </p>
      </div>

      <div v-if="profile.qualifications.length" class="flex flex-col gap-3">
        <div
          v-for="qualification in profile.qualifications"
          :key="qualification"
          class="flex items-center gap-4 p-4 rounded-xl border border-default bg-white dark:bg-neutral-900"
        >
          <div class="size-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
            <UIcon name="i-lucide-award" class="size-5 text-primary" />
          </div>
          <span class="text-sm text-muted">{{ qualification }}</span>
        </div>
      </div>
    </div>
  </section>
</template>
