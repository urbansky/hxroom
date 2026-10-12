<script setup lang="ts">
import { inject, computed, type Ref } from 'vue';
import { COACH_KEY, bookingCtaLabel, getAvatarUrl, hasAboutContent, type CoachProfile } from '../composables/useCoach';
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
const coachName = computed(() => coachProfile?.value?.name ?? 'Coach');
const ctaLabel = computed(() => bookingCtaLabel(coachProfile?.value));
const showAbout = computed(() => hasAboutContent(coachProfile?.value));

// Ohne Tagline trägt der Name die Überschrift. Eine lange Tagline (bis 160 Zeichen) bekommt
// eine kleinere Schrift, sonst füllt sie auf dem Handy den ganzen ersten Bildschirm.
const headline = computed(() => coachProfile?.value?.tagline || coachName.value);
const headlineSize = computed(() =>
  headline.value.length > 60 ? 'text-3xl sm:text-4xl' : 'text-4xl sm:text-5xl lg:text-[58px]',
);

// Nur Aussagen, die für jeden Coach stimmen. Wertungen wie „DSGVO-konform“ gehören nicht
// hierher, und ob ein Erstgespräch kostenlos ist, entscheidet der Coach mit seinen Angeboten.
const promises = ['Kein Konto nötig', 'Videogespräch im Browser', 'Server in Deutschland'];

// Ziel der beiden Haupt-CTAs: das erste Angebot der Liste (Reihenfolge pflegt der Coach).
const featuredOfferId = computed(() => offers.value[0]?.id ?? null);
</script>

<template>
  <SiteHeader nav>
    <template #cta>
      <UButton
        :to="featuredOfferId ? `/offers/${featuredOfferId}` : '#offers'"
        color="primary"
        icon="i-lucide-calendar"
        size="lg"
        class="px-5 max-w-56"
        :ui="{ label: 'truncate' }"
        :label="ctaLabel"
      />
    </template>
  </SiteHeader>

  <!-- Hero -->
  <section class="max-w-[720px] mx-auto px-6 flex flex-col items-stretch gap-14 pt-24 pb-10">
    <div class="flex flex-col items-center text-center gap-8">
      <h1 class="font-serif leading-[1.08] text-highlighted tracking-tight text-balance" :class="headlineSize">
        {{ headline }}
      </h1>

      <p v-if="coachProfile?.ctaIntro" class="text-base text-muted leading-[1.7] max-w-[420px] -mt-2">
        {{ coachProfile.ctaIntro }}
      </p>

      <div class="flex flex-col sm:flex-row items-center gap-4">
        <UButton :to="featuredOfferId ? `/offers/${featuredOfferId}` : '#offers'" size="xl" color="primary" icon="i-lucide-calendar" class="px-4">
          {{ ctaLabel }}
        </UButton>
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

    <!-- Coach-Karte: randloser Bildkopf, deshalb ohne Innenabstand der Karte -->
    <ContentCard :padded="false">
      <div class="coach-card-header relative h-[240px] flex items-center justify-center">
        <img v-if="avatarUrl" :src="avatarUrl" :alt="coachName" class="absolute inset-0 size-full object-cover object-top" />
        <span v-else class="font-serif text-8xl text-primary/70 select-none" aria-hidden="true">{{ coachName.charAt(0) }}</span>
      </div>
      <div class="p-6 sm:p-7 flex flex-col gap-4">
        <div>
          <h2 class="font-serif text-2xl text-highlighted leading-tight tracking-wide">{{ coachName }}</h2>
          <p v-if="coachProfile?.jobTitle" class="text-base text-muted mt-1 tracking-wide">{{ coachProfile.jobTitle }}</p>
        </div>

        <div v-if="coachProfile?.topics.length" class="flex flex-wrap gap-1.5">
          <UBadge v-for="topic in coachProfile.topics" :key="topic" color="neutral" variant="subtle" size="md">
            {{ topic }}
          </UBadge>
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

  <template v-if="showAbout && coachProfile">
    <USeparator class="max-w-[720px] mx-auto" />
    <AboutSection :coach="coachProfile" />
  </template>

  <SiteFooter />
</template>

<style scoped>
/* Farbfläche hinter dem Profilbild – trägt den Bildkopf samt Initiale, wenn der Coach noch
   kein eigenes Foto hochgeladen hat, und füllt bei Hochformat-Bildern die Ränder. */
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
