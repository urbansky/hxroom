<script setup lang="ts">
import { inject, type Ref } from 'vue';
import { COACH_KEY, type CoachProfile } from '../composables/useCoach';

// Auf jeder Seite der Buchungsseite: Impressum und Datenschutzerklärung (doc/legal.md §3.2,
// §4) und die AGB des Coachs, wenn er welche verlinkt hat.
const coachProfile = inject<Ref<CoachProfile | null>>(COACH_KEY);
</script>

<template>
  <UFooter :ui="{ container: 'max-w-[900px] px-6 lg:px-10' }">
    <template #left>
      <span class="text-xs text-dimmed">
        Gebrandeter HxRoom von
        <a href="https://hxroom.de" target="_blank" class="text-muted hover:text-default transition-colors no-underline">hxroom.de</a>&nbsp;·&nbsp;Server in Deutschland
      </span>
    </template>
    <template #right>
      <div class="flex items-center gap-5">
        <RouterLink to="/impressum" class="text-xs text-dimmed hover:text-muted transition-colors no-underline">Impressum</RouterLink>
        <RouterLink to="/datenschutz" class="text-xs text-dimmed hover:text-muted transition-colors no-underline">Datenschutz</RouterLink>
        <a
          v-if="coachProfile?.termsUrl"
          :href="coachProfile.termsUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="text-xs text-dimmed hover:text-muted transition-colors no-underline"
        >AGB</a>
      </div>
    </template>
  </UFooter>
</template>
