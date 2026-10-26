<script setup lang="ts">
// Nur Funktionen, die es in der Beta gibt. Was noch kommt, steht nicht auf der Seite.
const content = {
  label: 'Für dich als Coach',
  headlineMain: 'Ein Backoffice,',
  headlineEm: 'das dir nicht im Weg steht.',
  lede: 'Termine, Klienten und Notizen an einem Ort – so einfach, dass du es zwischen zwei Sitzungen erledigst.',
  features: [
    { icon: 'i-lucide-layout-template', title: 'Buchungsseite mit deinem Namen', text: 'Foto, Texte, Angebote und Impressum – unter deinname.hxroom.de.' },
    { icon: 'i-lucide-calendar-clock', title: 'Kalender und Verfügbarkeit', text: 'Du legst fest, wann man dich buchen kann. Alle Termine in einer Wochenansicht.' },
    { icon: 'i-lucide-bell-ring', title: 'Erinnerungen automatisch', text: 'Deine Klienten bekommen 24 Stunden und eine Stunde vorher eine Mail.' },
    { icon: 'i-lucide-notebook-pen', title: 'Notizen im Gespräch', text: 'Schreib mit, während ihr sprecht. Die Notizen bleiben beim Termin und beim Klienten.' },
    { icon: 'i-lucide-messages-square', title: 'Chat und Dateien', text: 'Ein Arbeitsblatt teilen oder einen Link schicken, ohne das Gespräch zu verlassen.' },
    { icon: 'i-lucide-flask-conical', title: 'Probe-Sitzung mit dir selbst', text: 'Am Rechner als Coach, auf dem Handy als Klient – so erlebst du beide Seiten.' },
  ],
}
</script>

<template>
  <section class="relative z-1 px-6 lg:px-12 py-[120px] max-sm:py-20 bg-(--ui-bg-muted)">
    <div class="max-w-[1180px] mx-auto">
      <div class="max-w-[720px] mb-14">
        <SectionLabel>{{ content.label }}</SectionLabel>
        <h2 class="font-serif text-[clamp(36px,4.5vw,54px)] font-light leading-[1.1] text-(--color-cream) tracking-[-0.015em] mb-6">
          {{ content.headlineMain }} <em class="italic text-gold-700 dark:text-gold-300">{{ content.headlineEm }}</em>
        </h2>
        <p class="text-[17px] text-(--ui-text) opacity-85 leading-[1.7]">{{ content.lede }}</p>
      </div>

      <div class="grid grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-14 items-start max-lg:grid-cols-1">
        <ul class="grid grid-cols-2 gap-x-8 gap-y-9 max-sm:grid-cols-1 max-sm:gap-y-7">
          <li v-for="feature in content.features" :key="feature.title" class="max-sm:flex max-sm:gap-4">
            <div class="size-10 rounded-[10px] bg-sage-600/10 dark:bg-sage-300/10 flex items-center justify-center mb-4 shrink-0 max-sm:mb-0">
              <UIcon :name="feature.icon" class="size-5 text-sage-700 dark:text-sage-300" />
            </div>
            <div>
              <h3 class="text-[16px] font-medium text-(--ui-text-highlighted) mb-1.5">{{ feature.title }}</h3>
              <p class="text-[15px] text-(--ui-text) opacity-80 leading-[1.6]">{{ feature.text }}</p>
            </div>
          </li>
        </ul>

        <ScreenFrame
          src="/screens/dashboard.webp"
          alt="Dashboard des Coachs mit den nächsten Terminen und Klienten"
          address="app.hxroom.de"
          :width="2880"
          :height="1800"
          class="lg:sticky lg:top-28"
        />
      </div>
    </div>
  </section>
</template>
