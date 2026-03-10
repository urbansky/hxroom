<script setup lang="ts">
const features = [
  {
    icon: 'i-lucide-monitor',
    title: 'Vollständiges Branding',
    body: 'Dein Logo, deine Farben, deine Domain. Klienten sehen nur dich – kein Zoom-Logo, kein Google-Stempel.',
    tag: 'Sofort sichtbar',
  },
  {
    icon: 'i-lucide-calendar',
    title: 'Buchung & automatischer Link',
    body: 'Klient bucht → bekommt automatisch seinen Raumlink per E-Mail. Keine manuelle Arbeit für dich.',
    tag: 'Zeitersparnis',
  },
  {
    icon: 'i-lucide-heart',
    title: 'Digitaler Warteraum',
    body: 'Dein Klient erscheint in deinem persönlichen Warteraum – mit deinem Foto, Namen und einer Willkommensnachricht.',
    tag: 'Vertrauen ab Minute 1',
  },
  {
    icon: 'i-lucide-user',
    title: 'Kein Account für Klienten',
    body: 'Dein Klient klickt auf den Link – und ist im Raum. Kein Download, kein Login, null Hürde.',
    tag: 'Null Reibung',
  },
  {
    icon: 'i-lucide-shield',
    title: 'DSGVO-konform by Design',
    body: 'Server in Deutschland. AVV automatisch inklusive. Du kannst gegenüber Klienten rechtssicher belegen, wo ihre Daten liegen.',
    tag: 'Rechtssicherheit',
    gold: true,
  },
  {
    icon: 'i-lucide-file-text',
    title: 'Notizen & KI-Zusammenfassung',
    body: 'Schreib direkt während des Calls. Nach der Sitzung erstellt HxRoom automatisch eine Zusammenfassung – nur für dich.',
    tag: 'Dokumentation',
  },
  {
    icon: 'i-lucide-bell',
    title: 'Automatische Erinnerungen',
    body: '24h und 1h vor jeder Sitzung bekommt dein Klient automatisch eine E-Mail-Erinnerung. Nie wieder No-Shows.',
    tag: 'Weniger No-Shows',
  },
  {
    icon: 'i-lucide-dollar-sign',
    title: 'Integrierte Bezahlung',
    body: 'Klient bucht und bezahlt in einem Schritt. Stripe-Integration, automatische Rechnungsstellung per E-Mail.',
    tag: 'Pro',
    gold: true,
  },
  {
    icon: 'i-lucide-users',
    title: 'Einfaches Klienten-CRM',
    body: 'Alle Klienten auf einen Blick. Notiz-Historie, letzter Termin, nächster Schritt – ohne aufwändiges Tool.',
    tag: 'Überblick',
  },
];
</script>

<template>
  <section class="relative z-1 max-w-[1200px] mx-auto px-6 lg:px-12 py-20 lg:py-24" id="features">
    <!-- Eyebrow -->
    <div class="inline-flex items-center gap-2 mb-4">
      <div class="w-6 h-px bg-sage-500" />
      <span class="text-[10px] text-sage-500 tracking-[0.12em] uppercase">Was HxRoom kann</span>
    </div>

    <!-- Title -->
    <h2 class="font-serif text-4xl lg:text-[54px] font-light text-sage-950 dark:text-cream leading-[1.1] tracking-tight mb-4">
      Kein Videocall-Tool.<br>Ein <em class="italic text-gold-500 dark:text-gold-300">kompletter Empfangsraum.</em>
    </h2>

    <p class="text-[15px] text-(--ui-text-muted) leading-[1.7] max-w-[480px] mb-14">
      Alles was du brauchst, um professionell online zu coachen – ohne IT-Stress, ohne Sammelsurium aus Tools.
    </p>

    <!-- Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="feature in features"
        :key="feature.title"
        class="feature-card bg-(--ui-bg-elevated) border border-(--ui-border) rounded-2xl p-7 transition-all hover:border-sage-400/20 hover:-translate-y-0.5 relative overflow-hidden"
      >
        <div class="feature-top-line" />

        <!-- Icon -->
        <div
          class="size-11 rounded-xl flex items-center justify-center mb-4.5 border"
          :class="feature.gold
            ? 'bg-gold-500/8 border-gold-500/14'
            : 'bg-sage-400/8 border-sage-400/14'"
        >
          <UIcon
            :name="feature.icon"
            class="size-5"
            :class="feature.gold ? 'text-gold-500' : 'text-sage-500'"
          />
        </div>

        <!-- Content -->
        <h3 class="font-serif text-xl text-sage-950 dark:text-cream mb-2.5 leading-[1.2]">{{ feature.title }}</h3>
        <p class="text-[13px] text-(--ui-text-muted) leading-[1.7]">{{ feature.body }}</p>

        <!-- Tag -->
        <span
          class="inline-block mt-3.5 text-[9px] tracking-[0.1em] uppercase rounded px-2 py-0.5 border"
          :class="feature.gold
            ? 'text-gold-500 bg-gold-500/8 border-gold-500/15'
            : 'text-sage-500 bg-sage-400/8 border-sage-400/15'"
        >{{ feature.tag }}</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.feature-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(139, 158, 138, 0.15), transparent);
}
</style>
