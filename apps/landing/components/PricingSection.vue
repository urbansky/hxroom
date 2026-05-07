<script setup lang="ts">
const plans = [
  {
    badge: 'Einstieg',
    name: 'Trial',
    desc: 'Alle Features, 14 Tage, ohne Kreditkarte.',
    price: '0 €',
    period: '/ 14 Tage',
    free: true,
    featured: false,
    gold: false,
    features: [
      { text: 'Alle Features freigeschaltet', active: true },
      { text: 'Branding & eigene Sub-Domain', active: true },
      { text: 'Buchung + automatischer Link', active: true },
      { text: 'DSGVO, AVV inklusive', active: true },
      { text: 'Kein Kreditkartenzwang', active: false },
    ],
    cta: 'Jetzt starten',
  },
  {
    badge: 'Empfohlen',
    name: 'Pro',
    desc: 'Für Solo-Coaches, die professionell online coachen.',
    price: '79 €',
    period: '/ Monat',
    free: false,
    featured: true,
    gold: false,
    features: [
      { text: 'Unlimitierte Sitzungen', active: true },
      { text: 'Alle Trial-Features', active: true },
      { text: 'Integrierte Stripe-Bezahlung', active: true },
      { text: 'Automatische Rechnungsstellung', active: true },
      { text: 'Kalender-Sync (Google/Apple)', active: true },
      { text: 'Eigene CNAME-Domain', active: true },
    ],
    cta: 'Trial starten',
  },
  {
    badge: 'Team',
    name: 'Studio',
    desc: 'Bis zu 3 Coaches unter einer gemeinsamen Marke.',
    price: '149 €',
    period: '/ Monat',
    free: false,
    featured: false,
    gold: true,
    features: [
      { text: 'Alle Pro-Features', active: true },
      { text: 'Bis zu 3 Coaches', active: true },
      { text: 'Gemeinsamer Kalender', active: true },
      { text: 'Rollen & Berechtigungen', active: true },
      { text: 'Konsolidierte Umsatzübersicht', active: true },
    ],
    cta: 'Jetzt starten',
  },
];
</script>

<template>
  <section class="relative z-1 max-w-[1200px] mx-auto px-6 lg:px-12 py-20 lg:py-24" id="preise">
    <!-- Eyebrow -->
    <div class="inline-flex items-center gap-2 mb-4">
      <div class="w-6 h-px bg-sage-500" />
      <span class="text-[10px] text-sage-500 tracking-[0.12em] uppercase">Preise</span>
    </div>

    <h2 class="font-serif text-4xl lg:text-[54px] font-light text-sage-950 dark:text-cream leading-[1.1] tracking-tight mb-4">
      Einfach.<br><em class="italic text-gold-500 dark:text-gold-300">Transparent.</em>
    </h2>

    <p class="text-[15px] text-(--ui-text-muted) leading-[1.7] max-w-[480px] mb-14">
      Kein Freemium. Trial gibt dir 14 Tage alle Features – dann entscheidest du.
    </p>

    <!-- Grid -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div
        v-for="plan in plans"
        :key="plan.name"
        class="pricing-card bg-(--ui-bg-elevated) border rounded-[20px] p-8 flex flex-col relative overflow-hidden transition-colors"
        :class="plan.featured ? 'border-sage-400/30 bg-gradient-to-b from-sage-400/6 to-transparent' : 'border-(--ui-border)'"
      >
        <!-- Featured top line -->
        <div v-if="plan.featured" class="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-sage-500 to-transparent" />

        <!-- Badge -->
        <span
          class="inline-block text-[9px] tracking-[0.1em] uppercase rounded px-2.5 py-0.5 border w-fit mb-5"
          :class="plan.gold
            ? 'text-gold-300 bg-gold-500/10 border-gold-500/20'
            : 'text-sage-200 bg-sage-400/12 border-sage-400/20'"
        >{{ plan.badge }}</span>

        <!-- Name -->
        <h3 class="font-serif text-2xl text-sage-950 dark:text-cream mb-1.5">{{ plan.name }}</h3>
        <p class="text-xs text-(--ui-text-muted) leading-relaxed mb-7">{{ plan.desc }}</p>

        <!-- Price -->
        <div class="flex items-baseline gap-1.5 mb-7">
          <span
            class="font-serif leading-none"
            :class="plan.free ? 'text-4xl text-sage-300' : 'text-5xl text-sage-950 dark:text-cream font-light'"
          >{{ plan.price }}</span>
          <span class="text-xs text-(--ui-text-dimmed)">{{ plan.period }}</span>
        </div>

        <!-- Divider -->
        <div class="h-px bg-(--ui-border) mb-6" />

        <!-- Features -->
        <div class="flex flex-col gap-2.5 flex-1 mb-7">
          <div
            v-for="f in plan.features"
            :key="f.text"
            class="flex items-start gap-2 text-[13px] leading-snug"
            :class="f.active ? 'text-(--ui-text-muted)' : 'text-(--ui-text-dimmed)'"
          >
            <UIcon
              name="i-lucide-check"
              class="size-3.5 shrink-0 mt-0.5"
              :class="f.active ? 'text-sage-500' : 'text-white/15'"
            />
            {{ f.text }}
          </div>
        </div>

        <!-- CTA -->
        <UButton
          block
          :color="plan.featured ? 'primary' : 'neutral'"
          :variant="plan.featured ? 'solid' : 'outline'"
          size="lg"
          :icon="plan.featured ? 'i-lucide-chevron-right' : undefined"
          :class="plan.featured ? 'shadow-lg shadow-sage-600/25' : ''"
        >
          {{ plan.cta }}
        </UButton>
      </div>
    </div>

    <p class="text-center mt-6 text-xs text-(--ui-text-dimmed)">
      Jahresabo: 2 Monate gratis — entspricht ~17 % Rabatt &nbsp;·&nbsp; Alle Preise zzgl. MwSt.
    </p>
  </section>
</template>
