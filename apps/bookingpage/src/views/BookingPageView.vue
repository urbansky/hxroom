<script setup lang="ts">
import { inject, computed, type Ref } from 'vue';
import { COACH_KEY, getAvatarUrl, type CoachProfile } from '../composables/useCoach';
import { OFFERS_KEY, type UseOffersReturn } from '../composables/useOffers';
import { formatOfferPrice } from '../utils/offers';

const coachProfile = inject<Ref<CoachProfile | null>>(COACH_KEY);
const { offers } = inject(OFFERS_KEY) as UseOffersReturn;

const avatarUrl = computed(() => coachProfile?.value ? getAvatarUrl(coachProfile.value) : null);

const coach = computed(() => ({
  name: coachProfile?.value?.name ?? 'Coach',
  initial: (coachProfile?.value?.name ?? 'C').charAt(0),
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

const sessionTypes = computed(() =>
  offers.value.map((offer, index) => ({
    id: offer.id,
    name: offer.name,
    duration: `${offer.durationMinutes} Minuten`,
    price: formatOfferPrice(offer.priceCents),
    free: offer.priceCents === null,
    featured: index === 0,
  })),
);

const featuredOfferId = computed(() => sessionTypes.value[0]?.id ?? null);

const credentials = [
  { icon: 'i-lucide-graduation-cap', text: 'ICF-zertifiziert (ACC) · International Coaching Federation' },
  { icon: 'i-lucide-clock', text: '8 Jahre Coaching-Erfahrung · 340+ begleitete Klienten' },
  { icon: 'i-lucide-users', text: 'Ausgebildet in systemischem Coaching & NLP' },
];
</script>

<template>
  <!-- Ambient Effects -->
  <div class="glow-top" />
  <div class="glow-bottom" />

  <!-- Header -->
  <UHeader
    :title="coach.name"
    :ui="{
      root: 'bg-(--ui-bg)/75 backdrop-blur-xl border-b border-(--ui-border)',
      container: 'max-w-[900px] px-6 lg:px-10',
    }"
  >
    <template #left>
      <a href="/" class="flex items-center gap-2.5 no-underline">
        <div class="size-[34px] rounded-[9px] overflow-hidden bg-gradient-to-br from-sage-400 to-sage-600 flex items-center justify-center font-serif text-[17px] text-white/92 font-semibold shrink-0">
          <img v-if="avatarUrl" :src="avatarUrl" class="size-full object-cover" alt="">
          <template v-else>{{ coach.initial }}</template>
        </div>
        <span class="font-serif text-xl font-semibold text-gold-700 dark:text-gold-200 tracking-wide">{{ coach.name }}</span>
      </a>
    </template>
    <template #default>
      <div class="hidden sm:flex items-center gap-6">
        <a href="#about" class="text-[15px] text-(--ui-text-muted) hover:text-(--ui-text) transition-colors tracking-wide no-underline">Über mich</a>
        <a href="#offers" class="text-[15px] text-(--ui-text-muted) hover:text-(--ui-text) transition-colors tracking-wide no-underline">Sitzungsarten</a>
      </div>
    </template>
    <template #right>
      <UButton :to="featuredOfferId ? `/offers/${featuredOfferId}` : '#offers'" color="primary" icon="i-lucide-calendar" size="lg" class="px-5">Termin buchen</UButton>
    </template>
  </UHeader>

  <!-- Hero -->
  <section class="relative z-1 max-w-[720px] mx-auto px-6 flex flex-col items-stretch gap-14 pt-32 pb-10">
    <!-- Text -->
    <div class="flex flex-col items-center text-center gap-8">
      <div class="inline-flex items-center gap-2 bg-sage-400/10 border border-sage-400/20 rounded-full px-3.5 py-1.5 w-fit">
        <div class="size-1.5 rounded-full bg-sage-400" />
        <span class="text-[11px] text-sage-700 dark:text-sage-200 tracking-[0.08em] uppercase">{{ coach.eyebrow }}</span>
      </div>

      <h1 class="font-serif text-5xl lg:text-[58px] font-light leading-[1.08] text-sage-950 dark:text-cream tracking-tight">
        Raum für das,<br>
        was <em class="italic text-gold-500 dark:text-gold-300">wirklich</em><br>
        zählt.
      </h1>

      <p class="text-base text-(--ui-text-muted) leading-[1.7] max-w-[420px]">
        Ich begleite Menschen in beruflichen Übergängen und persönlichen Wendepunkten – mit Klarheit, Offenheit und einer Methode, die zu dir passt.
      </p>

      <div class="flex flex-col sm:flex-row items-center gap-4">
        <UButton :to="featuredOfferId ? `/offers/${featuredOfferId}` : '#offers'" size="xl" color="primary" icon="i-lucide-calendar" class="shadow-lg shadow-sage-600/25 px-4">
          Erstgespräch buchen
        </UButton>
        <UButton to="#about" size="xl" variant="outline" color="neutral" class="px-5">
          Mehr erfahren
        </UButton>
      </div>

      <div class="flex flex-wrap items-center justify-center gap-5">
        <div class="flex items-center gap-1.5 text-xs text-(--ui-text-dimmed)">
          <UIcon name="i-lucide-check" class="size-[13px] text-sage-400" />
          Kein Account nötig
        </div>
        <div class="w-px h-3.5 bg-(--ui-border) hidden sm:block" />
        <div class="flex items-center gap-1.5 text-xs text-(--ui-text-dimmed)">
          <UIcon name="i-lucide-check" class="size-[13px] text-sage-400" />
          DSGVO-konform
        </div>
        <div class="w-px h-3.5 bg-(--ui-border) hidden sm:block" />
        <div class="flex items-center gap-1.5 text-xs text-(--ui-text-dimmed)">
          <UIcon name="i-lucide-check" class="size-[13px] text-sage-400" />
          Erstgespräch kostenlos
        </div>
      </div>
    </div>

    <!-- Coach Card -->
    <div class="coach-card bg-(--ui-bg-elevated) border border-(--ui-border) rounded-2xl overflow-hidden">
      <div class="coach-card-header relative h-[240px]">
        <img :src="avatarUrl ?? '/coach-example.jpg'" :alt="coach.name" class="absolute inset-0 size-full object-cover object-top" />
      </div>
      <div class="px-6 pb-6 pt-5 flex flex-col gap-4">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="font-serif text-[26px] font-normal text-sage-950 dark:text-cream leading-tight tracking-wide">{{ coach.name }}</h2>
            <p class="text-[15px] text-(--ui-text-muted) mt-1 tracking-wide">{{ coach.title }}</p>
          </div>
          <UBadge color="primary" variant="subtle" size="md" icon="i-lucide-check">
            Verifiziert
          </UBadge>
        </div>

        <p class="text-sm text-(--ui-text-muted) leading-relaxed">{{ coach.bio }}</p>

        <div class="flex flex-wrap gap-1.5">
          <UBadge v-for="topic in coach.topics" :key="topic" color="neutral" variant="subtle" size="md">
            {{ topic }}
          </UBadge>
        </div>

        <USeparator />

        <div class="flex gap-6">
          <div v-for="stat in coach.stats" :key="stat.label" class="flex flex-col gap-0.5">
            <span class="font-serif text-2xl text-sage-950 dark:text-cream font-light leading-none">{{ stat.value }}</span>
            <span class="text-xs text-(--ui-text-dimmed) tracking-[0.06em] uppercase">{{ stat.label }}</span>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Sitzungsarten wählen -->
  <div class="section-divider" />
  <section class="relative z-1 max-w-[720px] mx-auto px-6 py-10" id="offers">
    <div class="flex items-baseline gap-4 mb-7">
      <h2 class="font-serif text-[28px] font-light text-sage-950 dark:text-cream">Sitzungsarten</h2>
      <span class="text-xs text-(--ui-text-dimmed) tracking-wide">Schritt 1 · Angebot wählen</span>
    </div>

    <div class="flex flex-col gap-2">
      <RouterLink
        v-for="session in sessionTypes"
        :key="session.id"
        :to="`/offers/${session.id}`"
        class="flex items-center justify-between px-3.5 py-3 rounded-[10px] border cursor-pointer transition-colors no-underline"
        :class="session.featured
          ? 'bg-sage-400/8 border-sage-400/18 hover:bg-sage-400/12'
          : 'bg-black/[0.025] dark:bg-white/[0.025] border-black/[0.04] dark:border-white/[0.04] hover:bg-black/5 dark:hover:bg-white/5'"
      >
        <div class="flex items-center gap-2.5">
          <div class="size-2 rounded-full" :class="session.featured ? 'bg-sage-400' : 'bg-sage-600'" />
          <div>
            <div class="text-[15px] text-(--ui-text)" :class="session.featured ? 'text-sage-700 dark:text-sage-200' : ''">{{ session.name }}</div>
            <div class="text-xs text-(--ui-text-dimmed)">{{ session.duration }}</div>
          </div>
        </div>
        <div class="flex items-center gap-2.5">
          <span
            :class="session.free
              ? 'text-sage-400 text-sm'
              : 'font-serif text-lg text-sage-950 dark:text-cream'"
          >{{ session.price }}</span>
          <div class="size-5 rounded-md bg-black/5 dark:bg-white/5 flex items-center justify-center">
            <UIcon name="i-lucide-chevron-right" class="size-2.5 text-(--ui-text-dimmed)" />
          </div>
        </div>
      </RouterLink>
    </div>
  </section>

  <!-- About -->
  <div class="section-divider" />
  <section class="relative z-1 max-w-[720px] mx-auto px-6 py-10 flex flex-col gap-12" id="about">
    <h2 class="font-serif text-[28px] font-light text-sage-950 dark:text-cream mb-5">Über mich</h2>

    <blockquote class="border-l-2 border-sage-600 pl-5 py-3 -mt-6 mb-0">
      <p class="font-serif text-xl italic text-sage-950 dark:text-cream font-light leading-relaxed">
        „Klarheit entsteht nicht durch mehr Nachdenken – sondern durch andere Gespräche."
      </p>
    </blockquote>

    <div>
      <p class="text-[15px] text-(--ui-text-muted) leading-loose mb-4">
        Ich bin Anna, zertifizierte Life & Business Coach aus Berlin. Nach zehn Jahren in der Unternehmensberatung habe ich gemerkt: Die wichtigsten Veränderungen in meinem Leben kamen nicht aus Strategiepapieren, sondern aus echten Gesprächen, die mich herausgefordert haben.
      </p>
      <p class="text-[15px] text-(--ui-text-muted) leading-loose">
        Heute begleite ich Menschen, die an einem Wendepunkt stehen – die spüren, dass etwas nicht mehr stimmt, aber noch nicht wissen, wohin es gehen soll.
      </p>

      <div class="mt-7 flex flex-col gap-2.5">
        <div v-for="cred in credentials" :key="cred.text" class="flex items-center gap-2.5 p-3 px-3.5 bg-black/[0.025] dark:bg-white/[0.025] border border-black/[0.04] dark:border-white/[0.04] rounded-[10px]">
          <div class="size-7 rounded-[7px] bg-sage-400/10 border border-sage-400/15 flex items-center justify-center shrink-0">
            <UIcon :name="cred.icon" class="size-3.5 text-sage-400" />
          </div>
          <span class="text-[13px] text-(--ui-text-muted)">{{ cred.text }}</span>
        </div>
      </div>
    </div>
  </section>

  <!-- Footer -->
  <UFooter>
    <template #left>
      <span class="text-xs text-(--ui-text-dimmed)">
        Gebrandeter HxRoom von
        <a href="https://hxroom.io" target="_blank" class="text-sage-400/70 hover:text-sage-400 transition-colors no-underline">hxroom.io</a>
        &nbsp;·&nbsp;DSGVO-konform&nbsp;·&nbsp;Server Deutschland
      </span>
    </template>
    <template #right>
      <div class="flex items-center gap-5">
        <UColorModeButton size="xs" />
        <a href="#" class="text-xs text-(--ui-text-dimmed) hover:text-(--ui-text-muted) transition-colors no-underline">Datenschutz</a>
        <a href="#" class="text-xs text-(--ui-text-dimmed) hover:text-(--ui-text-muted) transition-colors no-underline">Impressum</a>
        <a href="#" class="text-xs text-(--ui-text-dimmed) hover:text-(--ui-text-muted) transition-colors no-underline">AGB</a>
      </div>
    </template>
  </UFooter>
</template>

<style scoped>
.glow-top {
  position: fixed;
  top: -200px;
  left: 50%;
  transform: translateX(-50%);
  width: 900px;
  height: 600px;
  border-radius: 50%;
  background: radial-gradient(ellipse, rgba(92, 110, 91, 0.07) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}

.glow-bottom {
  position: fixed;
  bottom: -300px;
  right: -200px;
  width: 700px;
  height: 700px;
  border-radius: 50%;
  background: radial-gradient(ellipse, rgba(181, 147, 90, 0.04) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}

.coach-card {
  box-shadow: 0 40px 80px rgba(0, 0, 0, 0.08);
}

:global(.dark) .coach-card {
  box-shadow: 0 40px 80px rgba(0, 0, 0, 0.5);
}

.coach-card-header {
  background:
    radial-gradient(ellipse 60% 80% at 40% 60%, rgba(92, 110, 91, 0.2) 0%, transparent 60%),
    radial-gradient(ellipse 40% 60% at 70% 30%, rgba(181, 147, 90, 0.08) 0%, transparent 60%),
    #c5d0c4;
}

:global(.dark) .coach-card-header {
  background:
    radial-gradient(ellipse 60% 80% at 40% 60%, rgba(92, 110, 91, 0.35) 0%, transparent 60%),
    radial-gradient(ellipse 40% 60% at 70% 30%, rgba(181, 147, 90, 0.12) 0%, transparent 60%),
    #0e1410;
}

.section-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--ui-border), transparent);
  max-width: 720px;
  margin: 0 auto;
}
</style>
