<script setup lang="ts">
import type { BookingPageProfile } from '@hxroom/shared'

// Profilkarte unter dem Kopfbereich: randloser Bildkopf, darunter Name, Berufsbezeichnung
// und Schwerpunkte. Kartenfläche wie SettingsSection im Coach-Backoffice – weiß, 1px Rand,
// großer Radius, bewusst ohne Schatten.
const { profile } = defineProps<{ profile: BookingPageProfile }>()
</script>

<template>
  <div class="rounded-xl border border-default bg-white dark:bg-neutral-900 overflow-hidden">
    <!-- Das Profilfoto ist immer quadratisch (512 × 512, siehe transcodeAvatar). Als Fläche über
         die ganze Kartenbreite bliebe davon nur ein Streifen übrig – rund in der Mitte bleibt
         das Gesicht ganz, und Foto und Initiale stehen an derselben Stelle. -->
    <div class="coach-card-header h-[240px] flex items-center justify-center">
      <div class="size-44 rounded-full overflow-hidden ring-4 ring-white/70 dark:ring-neutral-900/70 bg-white/30 dark:bg-neutral-900/30 flex items-center justify-center">
        <img v-if="profile.avatarUrl" :src="profile.avatarUrl" :alt="profile.name" class="size-full object-cover">
        <span v-else class="font-serif text-8xl text-primary/70 select-none" aria-hidden="true">{{ profile.name.charAt(0) }}</span>
      </div>
    </div>
    <div class="p-6 sm:p-7 flex flex-col gap-4">
      <div>
        <h2 class="font-serif text-2xl text-highlighted leading-tight tracking-wide">{{ profile.name }}</h2>
        <p v-if="profile.jobTitle" class="text-base text-muted mt-1 tracking-wide">{{ profile.jobTitle }}</p>
      </div>

      <div v-if="profile.topics.length" class="flex flex-wrap gap-1.5">
        <UBadge v-for="topic in profile.topics" :key="topic" color="neutral" variant="subtle" size="md">
          {{ topic }}
        </UBadge>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Farbfläche hinter dem runden Profilbild bzw. der Initiale. */
.coach-card-header {
  background:
    radial-gradient(ellipse 60% 80% at 40% 60%, rgba(92, 110, 91, 0.2) 0%, transparent 60%),
    radial-gradient(ellipse 40% 60% at 70% 30%, rgba(181, 147, 90, 0.08) 0%, transparent 60%),
    #c5d0c4;
}

:global(.dark) .coach-card-header {
  background:
    radial-gradient(ellipse 60% 80% at 40% 60%, rgba(92, 110, 91, 0.25) 0%, transparent 60%),
    radial-gradient(ellipse 40% 60% at 70% 30%, rgba(181, 147, 90, 0.1) 0%, transparent 60%),
    #0e1410;
}
</style>
