<script setup lang="ts">
const content = {
  label: 'Häufige Fragen',
  headlineMain: 'Was du wahrscheinlich',
  headlineEm: 'zuerst',
  headlineEnd: 'wissen willst.',
  items: [
    {
      q: 'Wann geht HxRoom live?',
      a: 'Geplanter Launch ist Q4 2026. Lieber ehrlich konservativ als zu optimistisch versprochen – Early-Access-Coaches bekommen Zugang, sobald die Kernfunktionen stabil laufen, voraussichtlich einige Wochen vor dem öffentlichen Start.',
    },
    {
      q: 'Was wird es kosten?',
      a: 'Die regulären Preise stehen erst zum Launch final fest. Early-Access-Coaches bekommen einen vergünstigten Einführungspreis auf Lebenszeit. Grobe Orientierung: Ab etwa 19 €/Monat geht es los.',
    },
    {
      q: 'Kann ich meinen Zoom behalten, bis HxRoom fertig ist?',
      a: 'Selbstverständlich. HxRoom ersetzt dein bisheriges Setup erst dann, wenn du bereit bist. Ein Umzug ist kein harter Schnitt – viele Coaches testen HxRoom zunächst mit einzelnen Klienten, bevor sie vollständig wechseln.',
    },
    {
      q: 'Brauchen meine Klienten einen Account?',
      a: 'Nein. Deine Klienten klicken auf einen Link und landen direkt im Warteraum. Kein Download, keine Registrierung, kein Passwort. Genau das ist der Punkt.',
    },
    {
      q: 'Wo liegen die Daten?',
      a: 'Auf Servern in Deutschland (Hetzner). AVV ist Bestandteil deines Vertrags, Subdienstleister sind transparent aufgeführt. Keine Weitergabe an US-Dienste, keine Übermittlung in unsichere Drittländer.',
    },
    {
      q: 'Was passiert mit meinen Daten, wenn ich kündige?',
      a: 'Du bekommst einen vollständigen Export (Klienten, Sitzungen, Notizen) – und danach werden deine Daten nach DSGVO-Vorgaben gelöscht. Kein Geisel-Modell, keine Wartefristen.',
    },
    {
      q: 'Gibt es schon Kunden / Testimonials?',
      a: 'Noch nicht öffentlich. HxRoom ist in aktiver Entwicklung, und ich suche gerade die ersten Beta-Coaches. Wenn du eine:r der Ersten sein willst – genau dafür ist diese Seite hier.',
    },
  ],
}
</script>

<template>
  <section class="relative z-1 py-[120px] px-12 max-sm:py-20 max-sm:px-6">
    <div class="max-w-[1100px] mx-auto">
      <!-- Label -->
      <div class="flex items-center gap-2.5 mb-[18px] text-[11px] text-sage-200 tracking-[0.14em] uppercase">
        <span class="w-6 h-px bg-sage-400 shrink-0" />
        {{ content.label }}
      </div>

      <!-- Headline -->
      <h2 class="font-serif text-[clamp(36px,4.5vw,54px)] font-light leading-[1.1] text-(--color-cream) tracking-[-0.015em] max-w-[760px] mb-14">
        {{ content.headlineMain }} <em class="italic text-gold-300">{{ content.headlineEm }}</em> {{ content.headlineEnd }}
      </h2>

      <!-- FAQ list -->
      <div class="max-w-[780px] mx-auto">
        <details
          v-for="item in content.items"
          :key="item.q"
          class="faq-item border-b border-(--ui-border) py-6"
        >
          <summary class="faq-summary font-serif text-[22px] text-(--color-cream) font-normal list-none cursor-pointer flex justify-between items-center transition-colors">
            {{ item.q }}
            <span class="faq-icon text-[24px] text-sage-400 font-light ml-4 shrink-0">+</span>
          </summary>
          <p class="mt-3.5 text-[15px] text-(--ui-text-muted) leading-[1.7]">{{ item.a }}</p>
        </details>
      </div>
    </div>
  </section>
</template>

<style scoped>
.faq-item[open] .faq-summary { color: var(--color-gold-300); }
.faq-item[open] .faq-icon { transform: rotate(45deg); }
.faq-summary::-webkit-details-marker { display: none; }
.faq-icon { transition: transform 0.2s; display: inline-block; }
</style>
