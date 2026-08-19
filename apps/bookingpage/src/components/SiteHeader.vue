<script setup lang="ts">
import { inject, computed, type Ref } from 'vue';
import { COACH_KEY, getAvatarUrl, type CoachProfile } from '../composables/useCoach';

// nav: die beiden Anker-Links "Über mich"/"Sitzungsarten" – nur auf Startseite und
// Angebotsseite sinnvoll, nicht auf den Landeseiten aus den E-Mails.
const { nav = false } = defineProps<{ nav?: boolean }>();

const coachProfile = inject<Ref<CoachProfile | null>>(COACH_KEY);
const avatarUrl = computed(() => coachProfile?.value ? getAvatarUrl(coachProfile.value) : null);
const coachName = computed(() => coachProfile?.value?.name ?? 'Coach');
</script>

<template>
  <!-- Fläche, Höhe und Sticky-Verhalten kommen aus dem Nuxt-UI-Default; überschrieben wird
       nur die Containerbreite, damit der Kopf zu den 720px-Sektionen passt.
       toggle=false: es gibt kein Mobilmenü, die Links sind Sprungmarken derselben Seite. -->
  <UHeader
    :toggle="false"
    :ui="{ container: 'max-w-[900px] px-6 lg:px-10' }"
  >
    <template #left>
      <RouterLink to="/" class="flex items-center gap-2.5 no-underline">
        <div class="size-9 rounded-full overflow-hidden bg-primary flex items-center justify-center font-serif text-lg text-inverted shrink-0">
          <img v-if="avatarUrl" :src="avatarUrl" class="size-full object-cover" alt="">
          <template v-else>{{ coachName.charAt(0) }}</template>
        </div>
        <span class="font-serif text-xl text-highlighted tracking-wide">{{ coachName }}</span>
      </RouterLink>
    </template>

    <template v-if="nav" #default>
      <div class="hidden sm:flex items-center gap-6">
        <RouterLink to="/#about" class="text-base text-muted hover:text-default transition-colors tracking-wide no-underline">Über mich</RouterLink>
        <RouterLink to="/#offers" class="text-base text-muted hover:text-default transition-colors tracking-wide no-underline">Sitzungsarten</RouterLink>
      </div>
    </template>

    <template #right>
      <slot name="cta" />
    </template>
  </UHeader>
</template>
