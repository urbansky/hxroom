<script setup lang="ts">
import { inject, computed, type Ref } from 'vue';
import { bookingPageCtaLabel, hasBookingPageAbout } from '@hxroom/shared';
import { BookingPageAbout, BookingPageCoachCard, BookingPageHero, BookingPageOfferItem } from '@hxroom/ui';
import { COACH_KEY, toBookingPageProfile, type CoachProfile } from '../composables/useCoach';
import { OFFERS_KEY, type UseOffersReturn } from '../composables/useOffers';
import SiteHeader from '../components/SiteHeader.vue';
import SiteFooter from '../components/SiteFooter.vue';
import SectionHeading from '../components/SectionHeading.vue';

// Die Inhalte kommen aus den geteilten Komponenten in @hxroom/ui – dieselben rendert die
// Vorschau unter Einstellungen → Buchungsseite in der Coach-App.
const coachProfile = inject<Ref<CoachProfile | null>>(COACH_KEY);
const { offers } = inject(OFFERS_KEY) as UseOffersReturn;

const profile = computed(() => coachProfile?.value ? toBookingPageProfile(coachProfile.value) : null);
const ctaLabel = computed(() => bookingPageCtaLabel(profile.value?.ctaButton));
const showAbout = computed(() => hasBookingPageAbout(profile.value));

// Ziel der beiden Haupt-CTAs: das erste Angebot der Liste (Reihenfolge pflegt der Coach).
const ctaTo = computed(() => offers.value[0] ? `/offers/${offers.value[0].id}` : '#offers');
</script>

<template>
  <SiteHeader nav>
    <template #cta>
      <UButton
        :to="ctaTo"
        color="primary"
        icon="i-lucide-calendar"
        size="lg"
        class="px-5 max-w-56"
        :ui="{ label: 'truncate' }"
        :label="ctaLabel"
      />
    </template>
  </SiteHeader>

  <template v-if="profile">
    <section class="max-w-[720px] mx-auto px-6 flex flex-col items-stretch gap-14 pt-24 pb-10">
      <BookingPageHero :profile="profile" :cta-to="ctaTo" />
      <BookingPageCoachCard :profile="profile" />
    </section>

    <!-- Sitzungsarten wählen -->
    <USeparator class="max-w-[720px] mx-auto" />
    <section id="offers" class="max-w-[720px] mx-auto px-6 py-10 scroll-mt-20">
      <SectionHeading title="Sitzungsarten" hint="Schritt 1 · Angebot wählen" class="mb-7" />

      <div class="flex flex-col gap-3">
        <BookingPageOfferItem v-for="offer in offers" :key="offer.id" :offer="offer" :to="`/offers/${offer.id}`" />
      </div>
    </section>

    <template v-if="showAbout">
      <USeparator class="max-w-[720px] mx-auto" />
      <BookingPageAbout :profile="profile" />
    </template>
  </template>

  <SiteFooter />
</template>
