<script setup lang="ts">
import { inject, computed, type Ref } from 'vue';
import { COACH_KEY, getAvatarUrl, type CoachProfile } from '../composables/useCoach';
import { OFFERS_KEY, type UseOffersReturn } from '../composables/useOffers';
import { formatOfferPrice, renderDescription, descriptionProseClasses } from '../utils/offers';

const props = defineProps<{ id: string }>();

const coachProfile = inject<Ref<CoachProfile | null>>(COACH_KEY);
const { offers, loading } = inject(OFFERS_KEY) as UseOffersReturn;

const avatarUrl = computed(() => coachProfile?.value ? getAvatarUrl(coachProfile.value) : null);
const coachName = computed(() => coachProfile?.value?.name ?? 'Coach');

const offer = computed(() => offers.value.find((o) => o.id === props.id) ?? null);
const notFound = computed(() => !loading.value && !offer.value);

const descriptionHtml = computed(() => offer.value ? renderDescription(offer.value.description) : '');

const otherOffers = computed(() => offers.value.filter((o) => o.id !== props.id));

// Platzhalter-Slots bis die Terminverwaltung angebunden ist – dieselben Beispieldaten wie im POC (doc/poc/buchungsseite-coach-*.html)
const nextSlots = computed(() => {
  if (!offer.value) return [];
  const type = `${offer.value.name} · ${offer.value.durationMinutes} min`;
  return [
    { day: 'Montag', date: '10. März', time: '10:00 – 10:30 Uhr', type, soon: true },
    { day: 'Dienstag', date: '11. März', time: '09:00 – 09:30 Uhr', type, soon: false },
    { day: 'Mittwoch', date: '12. März', time: '16:00 – 16:30 Uhr', type, soon: false },
    { day: 'Freitag', date: '14. März', time: '08:30 – 09:00 Uhr', type, soon: false },
  ];
});

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
    :title="coachName"
    :ui="{
      root: 'bg-(--ui-bg)/75 backdrop-blur-xl border-b border-(--ui-border)',
      container: 'max-w-[900px] px-6 lg:px-10',
    }"
  >
    <template #left>
      <RouterLink to="/" class="flex items-center gap-2.5 no-underline">
        <div class="size-[34px] rounded-[9px] overflow-hidden bg-gradient-to-br from-sage-400 to-sage-600 flex items-center justify-center font-serif text-[17px] text-white/92 font-semibold shrink-0">
          <img v-if="avatarUrl" :src="avatarUrl" class="size-full object-cover" alt="">
          <template v-else>{{ coachName.charAt(0) }}</template>
        </div>
        <span class="font-serif text-xl font-semibold text-gold-700 dark:text-gold-200 tracking-wide">{{ coachName }}</span>
      </RouterLink>
    </template>
    <template #default>
      <div class="hidden sm:flex items-center gap-6">
        <RouterLink to="/#about" class="text-[15px] text-(--ui-text-muted) hover:text-(--ui-text) transition-colors tracking-wide no-underline">Über mich</RouterLink>
        <RouterLink to="/#offers" class="text-[15px] text-(--ui-text-muted) hover:text-(--ui-text) transition-colors tracking-wide no-underline">Sitzungsarten</RouterLink>
      </div>
    </template>
    <template #right>
      <UButton v-if="offer" href="#slots" color="primary" icon="i-lucide-calendar" size="lg" class="px-5">Termin buchen</UButton>
    </template>
  </UHeader>

  <template v-if="loading">
    <div class="max-w-[640px] mx-auto px-6 pt-40 pb-20 flex justify-center">
      <UIcon name="i-lucide-loader-2" class="size-6 animate-spin text-(--ui-text-dimmed)" />
    </div>
  </template>

  <template v-else-if="notFound">
    <div class="min-h-[60vh] flex flex-col items-center justify-center gap-6 px-6 text-center pt-24">
      <div class="size-16 rounded-2xl bg-(--ui-bg-elevated) border border-(--ui-border) flex items-center justify-center">
        <UIcon name="i-lucide-search-x" class="size-7 text-(--ui-text-dimmed)" />
      </div>
      <div class="flex flex-col gap-2 max-w-sm">
        <h1 class="font-serif text-2xl font-light text-sage-950 dark:text-cream">Angebot nicht gefunden</h1>
        <p class="text-sm text-(--ui-text-muted) leading-relaxed">
          Dieses Angebot existiert nicht mehr oder ist aktuell nicht buchbar.
        </p>
      </div>
      <RouterLink to="/#offers" class="text-xs text-sage-400 hover:text-sage-500 transition-colors no-underline">
        Alle Sitzungsarten ansehen
      </RouterLink>
    </div>
  </template>

  <template v-else-if="offer">
    <!-- Angebot + Termine -->
    <section class="relative z-1 max-w-[640px] mx-auto px-6 pb-20" style="padding-top: 120px;">
      <RouterLink to="/#offers" class="inline-flex items-center gap-1.5 text-[13px] text-(--ui-text-muted) hover:text-(--ui-text) transition-colors no-underline mb-5">
        <UIcon name="i-lucide-chevron-left" class="size-3.5" />
        Alle Sitzungsarten
      </RouterLink>

      <div class="bg-(--ui-bg-elevated) border border-(--ui-border) rounded-2xl p-8 flex flex-col gap-6">
        <div class="inline-flex items-center gap-2 bg-sage-400/10 border border-sage-400/20 rounded-full px-3.5 py-1.5 w-fit">
          <div class="size-1.5 rounded-full bg-sage-400" />
          <span class="text-[11px] text-sage-700 dark:text-sage-200 tracking-[0.08em] uppercase">Buchung · {{ coachName }}</span>
        </div>

        <h1 class="font-serif text-4xl font-light text-sage-950 dark:text-cream leading-[1.1] -mt-1">{{ offer.name }}</h1>

        <div class="flex gap-2.5">
          <UBadge color="neutral" variant="subtle" size="md">{{ offer.durationMinutes }} Minuten</UBadge>
          <UBadge v-if="offer.priceCents === null" color="primary" variant="subtle" size="md">Kostenlos</UBadge>
          <UBadge v-else color="neutral" variant="subtle" size="md">{{ formatOfferPrice(offer.priceCents) }}</UBadge>
        </div>

        <div v-if="descriptionHtml" :class="descriptionProseClasses" v-html="descriptionHtml" />

        <div class="flex items-center gap-3">
          <div class="size-11 rounded-full overflow-hidden bg-(--ui-bg-accented) border border-(--ui-border) shrink-0">
            <img v-if="avatarUrl" :src="avatarUrl" :alt="coachName" class="size-full object-cover" />
          </div>
          <div>
            <div class="text-[13px] text-(--ui-text) font-medium">{{ coachName }}</div>
            <div class="text-xs text-(--ui-text-dimmed) mt-0.5">Life & Business Coach</div>
          </div>
        </div>

        <USeparator />

        <div class="flex items-baseline gap-4" id="slots">
          <h2 class="font-serif text-xl font-light text-sage-950 dark:text-cream">Freie Termine</h2>
          <span class="text-xs text-(--ui-text-dimmed) tracking-wide">Alle Zeiten in MEZ</span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div
            v-for="(slot, i) in nextSlots"
            :key="i"
            class="bg-(--ui-bg) border rounded-[14px] p-[18px] flex flex-col gap-2.5 cursor-pointer transition-all hover:border-sage-400/30 hover:bg-(--ui-bg-accented) hover:-translate-y-0.5 relative overflow-hidden"
            :class="slot.soon ? 'border-sage-400/20' : 'border-(--ui-border)'"
          >
            <div v-if="slot.soon" class="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-sage-600 to-sage-400" />
            <div class="text-[10px] text-(--ui-text-dimmed) uppercase tracking-[0.1em]">{{ slot.day }}</div>
            <div class="font-serif text-[22px] text-sage-950 dark:text-cream font-light leading-none">{{ slot.date }}</div>
            <div class="text-[13px] text-(--ui-text-muted)">{{ slot.time }}</div>
            <div class="text-[11px] text-(--ui-text-dimmed) tracking-wide">{{ slot.type }}</div>
            <div class="flex items-center gap-1 mt-1 text-xs text-sage-700 dark:text-sage-200">
              <UIcon name="i-lucide-calendar" class="size-[11px] text-sage-400" />
              Buchen
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Andere Sitzungsarten -->
    <template v-if="otherOffers.length">
      <div class="section-divider" />
      <section class="relative z-1 max-w-[640px] mx-auto px-6 py-10">
        <div class="flex items-baseline gap-4 mb-7">
          <h2 class="font-serif text-[28px] font-light text-sage-950 dark:text-cream">Andere Sitzungsarten</h2>
          <span class="text-xs text-(--ui-text-dimmed) tracking-wide">Passt doch nicht ganz?</span>
        </div>

        <div class="flex flex-col gap-2">
          <RouterLink
            v-for="other in otherOffers"
            :key="other.id"
            :to="`/offers/${other.id}`"
            class="flex items-center justify-between px-3.5 py-3 rounded-[10px] border bg-black/[0.025] dark:bg-white/[0.025] border-black/[0.04] dark:border-white/[0.04] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors no-underline"
          >
            <div class="flex items-center gap-2.5">
              <div class="size-2 rounded-full bg-sage-600" />
              <div>
                <div class="text-[15px] text-(--ui-text)">{{ other.name }}</div>
                <div class="text-xs text-(--ui-text-dimmed)">{{ other.durationMinutes }} Minuten</div>
              </div>
            </div>
            <div class="flex items-center gap-2.5">
              <span
                :class="other.priceCents === null
                  ? 'text-sage-400 text-sm'
                  : 'font-serif text-lg text-sage-950 dark:text-cream'"
              >{{ formatOfferPrice(other.priceCents) }}</span>
              <div class="size-5 rounded-md bg-black/5 dark:bg-white/5 flex items-center justify-center">
                <UIcon name="i-lucide-chevron-right" class="size-2.5 text-(--ui-text-dimmed)" />
              </div>
            </div>
          </RouterLink>
        </div>
      </section>
    </template>

    <!-- About -->
    <div class="section-divider" />
    <section class="relative z-1 max-w-[640px] mx-auto px-6 py-10 flex flex-col gap-12" id="about">
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
  </template>

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

.section-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--ui-border), transparent);
  max-width: 640px;
  margin: 0 auto;
}
</style>
