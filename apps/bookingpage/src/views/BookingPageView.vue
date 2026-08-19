<script setup lang="ts">
import { inject, computed, type Ref } from 'vue';
import { COACH_KEY, getAvatarUrl, type CoachProfile } from '../composables/useCoach';
import { OFFERS_KEY, type UseOffersReturn } from '../composables/useOffers';
import SiteHeader from '../components/SiteHeader.vue';
import SiteFooter from '../components/SiteFooter.vue';
import ContentCard from '../components/ContentCard.vue';
import SectionHeading from '../components/SectionHeading.vue';
import OfferListItem from '../components/OfferListItem.vue';
import AboutSection from '../components/AboutSection.vue';

const coachProfile = inject<Ref<CoachProfile | null>>(COACH_KEY);
const { offers } = inject(OFFERS_KEY) as UseOffersReturn;

const avatarUrl = computed(() => coachProfile?.value ? getAvatarUrl(coachProfile.value) : null);

// Titel, Bio, Themen und Kennzahlen sind Beispielinhalte: der öffentliche Endpunkt liefert
// bisher nur Name und Profilbild, die vom Coach gepflegten Felder (tagline, bio) nicht.
const coach = computed(() => ({
  name: coachProfile?.value?.name ?? 'Coach',
  title: 'Zertifizierte Life & Business Coach · 8 Jahre Erfahrung',
  eyebrow: 'Life Coaching · Berlin & online',
  bio: 'Ich arbeite mit Menschen, die an einem Wendepunkt stehen – beruflich oder persönlich – und Klarheit suchen, wo es gerade nur Nebel gibt.',
  topics: ['Beruflicher Neustart', 'Selbstvertrauen', 'Work-Life-Balance', 'Führung'],
  stats: [
    { value: '340+', label: 'Sitzungen' },
    { value: '8', label: 'Jahre' },
    { value: '4.9', label: 'Bewertung' },
  ],
}));

// Ziel der beiden Haupt-CTAs: das erste Angebot der Liste (Reihenfolge pflegt der Coach).
const featuredOfferId = computed(() => offers.value[0]?.id ?? null);
</script>

<template>
  <SiteHeader nav>
    <template #cta>
      <UButton :to="featuredOfferId ? `/offers/${featuredOfferId}` : '#offers'" color="primary" icon="i-lucide-calendar" size="lg" class="px-5">
        Termin buchen
      </UButton>
    </template>
  </SiteHeader>

  <!-- Hero -->
  <section class="max-w-[720px] mx-auto px-6 flex flex-col items-stretch gap-14 pt-24 pb-10">
    <div class="flex flex-col items-center text-center gap-8">
      <div class="inline-flex items-center gap-2 bg-primary/10 rounded-full px-3.5 py-1.5 w-fit">
        <div class="size-1.5 rounded-full bg-primary" />
        <span class="text-xs text-primary tracking-[0.08em] uppercase">{{ coach.eyebrow }}</span>
      </div>

      <h1 class="font-serif text-5xl lg:text-[58px] leading-[1.08] text-highlighted tracking-tight">
        Raum für das,<br>
        was <em class="italic text-secondary">wirklich</em><br>
        zählt.
      </h1>

      <p class="text-base text-muted leading-[1.7] max-w-[420px]">
        Ich begleite Menschen in beruflichen Übergängen und persönlichen Wendepunkten – mit Klarheit, Offenheit und einer Methode, die zu dir passt.
      </p>

      <div class="flex flex-col sm:flex-row items-center gap-4">
        <UButton :to="featuredOfferId ? `/offers/${featuredOfferId}` : '#offers'" size="xl" color="primary" icon="i-lucide-calendar" class="px-4">
          Erstgespräch buchen
        </UButton>
        <UButton to="#about" size="xl" variant="outline" color="neutral" class="px-5">
          Mehr erfahren
        </UButton>
      </div>

      <div class="flex flex-wrap items-center justify-center gap-5">
        <div v-for="promise in ['Kein Account nötig', 'DSGVO-konform', 'Erstgespräch kostenlos']" :key="promise" class="flex items-center gap-1.5 text-xs text-muted">
          <UIcon name="i-lucide-check" class="size-3.5 text-primary" />
          {{ promise }}
        </div>
      </div>
    </div>

    <!-- Coach-Karte: randloser Bildkopf, deshalb ohne Innenabstand der Karte -->
    <ContentCard :padded="false">
      <div class="coach-card-header relative h-[240px]">
        <img :src="avatarUrl ?? '/coach-example.jpg'" :alt="coach.name" class="absolute inset-0 size-full object-cover object-top" />
      </div>
      <div class="p-6 sm:p-7 flex flex-col gap-4">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="font-serif text-2xl text-highlighted leading-tight tracking-wide">{{ coach.name }}</h2>
            <p class="text-base text-muted mt-1 tracking-wide">{{ coach.title }}</p>
          </div>
          <UBadge color="primary" variant="subtle" size="md" icon="i-lucide-check">
            Verifiziert
          </UBadge>
        </div>

        <p class="text-sm text-muted leading-relaxed">{{ coach.bio }}</p>

        <div class="flex flex-wrap gap-1.5">
          <UBadge v-for="topic in coach.topics" :key="topic" color="neutral" variant="subtle" size="md">
            {{ topic }}
          </UBadge>
        </div>

        <USeparator />

        <div class="flex gap-6">
          <div v-for="stat in coach.stats" :key="stat.label" class="flex flex-col gap-0.5">
            <span class="font-serif text-2xl text-highlighted leading-none">{{ stat.value }}</span>
            <span class="text-xs text-dimmed tracking-[0.06em] uppercase">{{ stat.label }}</span>
          </div>
        </div>
      </div>
    </ContentCard>
  </section>

  <!-- Sitzungsarten wählen -->
  <USeparator class="max-w-[720px] mx-auto" />
  <section id="offers" class="max-w-[720px] mx-auto px-6 py-10 scroll-mt-20">
    <SectionHeading title="Sitzungsarten" hint="Schritt 1 · Angebot wählen" class="mb-7" />

    <div class="flex flex-col gap-3">
      <OfferListItem v-for="offer in offers" :key="offer.id" :offer="offer" />
    </div>
  </section>

  <USeparator class="max-w-[720px] mx-auto" />
  <AboutSection />

  <SiteFooter />
</template>

<style scoped>
/* Farbfläche hinter dem Profilbild – trägt den Bildkopf, wenn der Coach noch kein eigenes
   Foto hochgeladen hat, und füllt bei Hochformat-Bildern die Ränder. */
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
