<script setup lang="ts">
// Ein angedeuteter geteilter Bildschirm – das Gegenstück zu CallVideoSim.
//
// Im Prototyp wird nichts übertragen, und eine leere Fläche verriete nicht, ob die
// Aufteilung bei laufender Freigabe trägt: ob die beiden Videos daneben noch groß genug
// sind, ob die Steuerleiste den geteilten Inhalt anschneidet. Deshalb steht hier die
// Andeutung eines Fensters mit Text und Abbildung.
//
// Bewusst neutral: kein Programm, kein Logo, keine lesbare Zeile. Es geht um die Fläche.

const SIDEBAR_ROWS = [16, 23, 30, 37]
const TEXT_ROWS = [30, 37, 44, 51, 58]
</script>

<template>
  <div class="absolute inset-0 overflow-hidden" aria-hidden="true">
    <svg class="size-full" viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice">
      <rect x="0" y="0" width="160" height="100" fill="#EFECE3" />

      <!-- Fensterleiste -->
      <rect x="0" y="0" width="160" height="8" fill="#DFDACC" />
      <circle cx="6" cy="4" r="1.4" fill="#C6BFAC" />
      <circle cx="11" cy="4" r="1.4" fill="#C6BFAC" />
      <circle cx="16" cy="4" r="1.4" fill="#C6BFAC" />

      <!-- Seitenspalte des Fensters -->
      <rect x="0" y="8" width="34" height="92" fill="#E2DDCD" />
      <rect v-for="y in SIDEBAR_ROWS" :key="`s${y}`" x="6" :y="y" width="22" height="3" rx="1.5" fill="#CBC4AF" />

      <!-- Inhalt: Überschrift, Textzeilen, Abbildungen -->
      <rect x="44" y="18" width="52" height="5" rx="2.5" fill="#B3A991" />
      <rect
        v-for="(y, index) in TEXT_ROWS"
        :key="`t${y}`"
        x="44"
        :y="y"
        :width="index === TEXT_ROWS.length - 1 ? 60 : 104"
        height="3.5"
        rx="1.75"
        fill="#CFC7B3"
      />
      <rect x="44" y="72" width="70" height="20" rx="2" fill="#D5CFBC" />
      <rect x="120" y="72" width="28" height="20" rx="2" fill="#DDD8C8" />
    </svg>
  </div>
</template>
