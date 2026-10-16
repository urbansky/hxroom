<script setup lang="ts">
// Produkt-Tour aus Sicht des Klienten (phase5-umsetzungsplan.md, Schritt 9). Die Bilder
// kommen mit 9b, bis dahin zeigt ScreenFrame Platzhalter im richtigen Seitenverhältnis.
const content = {
  label: 'So funktioniert’s',
  headlineMain: 'Vom Termin bis zum Gespräch –',
  headlineEm: 'unter deinem Namen.',
  lede: 'So erlebt dein Klient HxRoom. Kein Download, kein Konto, kein fremdes Logo.',
  steps: [
    {
      title: 'Er bucht auf deiner Seite',
      text: 'Deine Buchungsseite unter deinname.hxroom.de: dein Foto, deine Angebote, freie Zeiten aus deiner Verfügbarkeit. Dein Klient wählt einen Termin und bestätigt ihn per Mail.',
      alt: 'Buchungsseite',
      address: 'demo.hxroom.de',
    },
    {
      title: 'Er bekommt alles per Mail',
      text: 'Die Bestätigung mit Termin, Kalendereintrag und dem Link zu eurem Gespräch. 24 Stunden und eine Stunde vorher erinnert HxRoom ihn automatisch.',
      alt: 'Bestätigungsmail',
      address: undefined,
    },
    {
      title: 'Er wartet bei dir, nicht bei Zoom',
      text: 'Ein Klick auf den Link, und er sitzt in deinem Warteraum: mit deinem Foto und deinem Namen. Kamera und Mikrofon prüft er vorher in Ruhe. Du siehst sofort, dass er da ist.',
      alt: 'Warteraum',
      address: 'demo.hxroom.de/call/…',
    },
    {
      title: 'Du lässt ihn herein',
      text: 'Ihr sprecht in einem ruhigen Raum ohne Ablenkung. Daneben deine Notizen, und wenn ihr sie braucht, Chat und Dateien.',
      alt: 'Gespräch mit Notizen',
      address: 'app.hxroom.de/call/…',
    },
  ],
}
</script>

<template>
  <section id="so-funktionierts" class="relative z-1 px-6 lg:px-12 py-[120px] max-sm:py-20 scroll-mt-16">
    <div class="max-w-[1180px] mx-auto">
      <div class="max-w-[720px] mb-20 max-sm:mb-12">
        <SectionLabel>{{ content.label }}</SectionLabel>
        <h2 class="font-serif text-[clamp(36px,4.5vw,54px)] font-light leading-[1.1] text-(--color-cream) tracking-[-0.015em] mb-6">
          {{ content.headlineMain }} <em class="italic text-gold-700 dark:text-gold-300">{{ content.headlineEm }}</em>
        </h2>
        <p class="text-[17px] text-(--ui-text) opacity-85 leading-[1.7]">{{ content.lede }}</p>
      </div>

      <ol class="flex flex-col gap-24 max-sm:gap-16">
        <li
          v-for="(step, i) in content.steps"
          :key="step.title"
          class="grid gap-14 items-center max-lg:grid-cols-1 max-lg:gap-8"
          :class="i % 2 === 1 ? 'grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]' : 'grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]'"
        >
          <div :class="i % 2 === 1 ? 'lg:order-2' : ''">
            <div class="font-serif text-[56px] leading-none italic font-light text-gold-400/70 mb-4">{{ i + 1 }}</div>
            <h3 class="font-serif text-[30px] font-normal leading-[1.2] text-(--color-cream) mb-4">{{ step.title }}</h3>
            <p class="text-[16px] text-(--ui-text) opacity-85 leading-[1.75] max-w-[440px]">{{ step.text }}</p>
          </div>
          <ScreenFrame :alt="step.alt" :address="step.address" />
        </li>
      </ol>
    </div>
  </section>
</template>
