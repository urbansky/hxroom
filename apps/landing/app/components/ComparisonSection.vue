<script setup lang="ts">
const rows = [
  'Branding & eigene Domain',
  'Buchung integriert',
  'Kein Login für Klienten',
  'Persönlicher Warteraum',
  'DSGVO – Server Deutschland',
  'Automatische Erinnerungen',
  'Sitzungsnotizen & KI',
  'Integrierte Bezahlung',
  'Klienten-Übersicht (CRM)',
  'DACH-Markt & Deutsch',
];
</script>

<template>
  <div class="relative z-1 bg-white/[0.015] dark:bg-white/[0.015] border-y border-(--ui-border)" id="vergleich">
    <div class="max-w-[900px] mx-auto px-6 lg:px-12 py-20">
      <!-- Eyebrow -->
      <div class="inline-flex items-center gap-2 mb-4">
        <div class="w-6 h-px bg-sage-500" />
        <span class="text-[10px] text-sage-500 tracking-[0.12em] uppercase">HxRoom vs. Zoom / Meet</span>
      </div>

      <h2 class="font-serif text-4xl lg:text-[54px] font-light text-sage-950 dark:text-cream leading-[1.1] tracking-tight">
        Kein Ersatz.<br>Ein <em class="italic text-gold-500 dark:text-gold-300">Upgrade.</em>
      </h2>

      <!-- Table -->
      <table class="w-full border-collapse mt-10">
        <thead>
          <tr>
            <th class="px-6 py-3.5 text-left font-serif text-lg font-normal text-sage-950 dark:text-cream border-b border-(--ui-border)">Feature</th>
            <th class="px-6 py-3.5 text-center text-sm font-normal text-(--ui-text-muted) border-b border-(--ui-border)">Zoom / Meet</th>
            <th class="px-6 py-3.5 text-center font-serif text-lg font-normal text-sage-200 bg-sage-400/6 border border-sage-400/15 border-b-0 rounded-t-lg">HxRoom</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, i) in rows" :key="row">
            <td class="px-6 py-3.5 text-[13px] text-(--ui-text) border-b border-white/4">{{ row }}</td>
            <td class="px-6 py-3.5 text-center border-b border-white/4">
              <span v-if="row === 'DSGVO – Server Deutschland'" class="text-[11px] text-amber-400/60">&#9888; US-Server</span>
              <span v-else class="text-sm text-white/20">—</span>
            </td>
            <td
              class="px-6 py-3.5 text-center bg-sage-400/4 border-x border-sage-400/10"
              :class="i === rows.length - 1 ? 'rounded-b-lg border-b border-sage-400/10' : ''"
            >
              <span class="text-base text-sage-500">&#10003;</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
