<script setup lang="ts">
// Vue-APIs explizit, U-Komponenten beim Resolver – siehe Kommentar in CallVideoArea.
import { computed } from 'vue'
import { bookingPageCtaLabel, hasBookingPageAbout, type BookingPageProfile } from '@hxroom/shared'

// Kopfbereich der Buchungsseite. Geteilt mit der Vorschau in der Coach-App, damit beide
// dieselbe Seite zeigen; Verlinkung und Interaktion regelt die einbindende App.
const { profile, ctaTo, bookable = true } = defineProps<{
  profile: BookingPageProfile
  /** Ziel der Buchungs-Buttons, auf der Buchungsseite das erste Angebot. */
  ctaTo: string
  /**
   * false ohne vollständiges Impressum (doc/legal.md §3.2): Statt des Buchungs-Buttons steht
   * ein Hinweis, die Seite selbst bleibt sichtbar.
   */
  bookable?: boolean
}>()

const ctaLabel = computed(() => bookingPageCtaLabel(profile.ctaButton))
const showAbout = computed(() => hasBookingPageAbout(profile))

// Ohne Tagline trägt der Name die Überschrift. Eine lange Tagline (bis 160 Zeichen) bekommt
// eine kleinere Schrift, sonst füllt sie auf dem Handy den ganzen ersten Bildschirm.
const headline = computed(() => profile.tagline?.trim() || profile.name)
const headlineSize = computed(() =>
  headline.value.length > 60 ? 'text-3xl sm:text-4xl' : 'text-4xl sm:text-5xl lg:text-[58px]',
)

// Nur Aussagen, die für jeden Coach stimmen. Wertungen wie „DSGVO-konform“ gehören nicht
// hierher, und ob ein Erstgespräch kostenlos ist, entscheidet der Coach mit seinen Angeboten.
const promises = ['Kein Konto nötig', 'Videogespräch im Browser', 'Server in Deutschland']
</script>

<template>
  <div class="flex flex-col items-center text-center gap-8">
    <h1 class="font-serif leading-[1.08] text-highlighted tracking-tight text-balance" :class="headlineSize">
      {{ headline }}
    </h1>

    <p v-if="profile.ctaIntro" class="text-base text-muted leading-[1.7] max-w-[420px] -mt-2">
      {{ profile.ctaIntro }}
    </p>

    <div class="flex flex-col sm:flex-row items-center gap-4">
      <UButton v-if="bookable" :to="ctaTo" size="xl" color="primary" icon="i-lucide-calendar" class="px-4">
        {{ ctaLabel }}
      </UButton>
      <div v-else class="flex items-center gap-2 rounded-lg border border-default bg-elevated px-4 py-3 text-sm text-muted">
        <UIcon name="i-lucide-calendar-clock" class="size-4 text-primary shrink-0" />
        Buchungen sind bald möglich.
      </div>
      <UButton v-if="showAbout" to="#about" size="xl" variant="outline" color="neutral" class="px-5">
        Mehr erfahren
      </UButton>
    </div>

    <div class="flex flex-wrap items-center justify-center gap-5">
      <div v-for="promise in promises" :key="promise" class="flex items-center gap-1.5 text-xs text-muted">
        <UIcon name="i-lucide-check" class="size-3.5 text-primary" />
        {{ promise }}
      </div>
    </div>
  </div>
</template>
