<script setup lang="ts">
import { computed, inject, onMounted, ref, type Ref } from 'vue';
import type { Imprint } from '@hxroom/shared';
import { LegalPrivacyPolicy } from '@hxroom/ui';
import { COACH_KEY, type CoachProfile } from '../composables/useCoach';
import { apiUrl, orgSlug } from '../utils/api';
import SiteHeader from '../components/SiteHeader.vue';
import SiteFooter from '../components/SiteFooter.vue';

// Datenschutzerklärung der Buchungsseite (doc/legal.md §4): der gemeinsame Text von HxRoom,
// mit dem Coach als Verantwortlichem für Abschnitt 8. Name und Anschrift stammen aus seinem
// Impressum; hat er nur auf sein eigenes verlinkt, steht hier der Name und der Verweis aufs
// Impressum dieser Seite.

interface ImprintResponse {
  mode: 'form' | 'link' | null;
  imprint: Imprint | null;
  url: string | null;
}

const coachProfile = inject<Ref<CoachProfile | null>>(COACH_KEY);
const imprint = ref<Imprint | null>(null);

onMounted(async () => {
  try {
    const res = await fetch(`${apiUrl}/api/v1/organizations/${orgSlug()}/imprint`);
    if (res.ok) imprint.value = ((await res.json()) as ImprintResponse).imprint;
  } catch {
    // Ohne Angaben bleibt der Name aus dem Profil und der Verweis aufs Impressum.
  }
});

const controller = computed(() => {
  const i = imprint.value;
  if (i) {
    return {
      name: i.name,
      addressLines: [i.street, `${i.postalCode} ${i.city}`, i.country],
      email: i.email,
    };
  }
  return { name: coachProfile?.value?.name ?? 'Coach', addressLines: [], email: null };
});
</script>

<template>
  <SiteHeader />

  <section class="max-w-[760px] mx-auto px-6 pt-16 pb-20">
    <div class="legal-container">
      <span class="legal-eyebrow">Rechtliches</span>
      <h1 class="legal-headline">Datenschutz&shy;erklärung</h1>
      <p class="legal-sub">Was mit deinen Daten geschieht, wenn du über diese Seite einen Termin buchst und am Gespräch teilnimmst – vor allem in Abschnitt 8.</p>

      <LegalPrivacyPolicy
        :controller="controller"
        imprint-href="/impressum"
        :coach-privacy-url="coachProfile?.privacyUrl ?? null"
      />
    </div>
  </section>

  <SiteFooter />
</template>
