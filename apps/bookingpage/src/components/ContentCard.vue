<script setup lang="ts">
// Kartenfläche der Buchungsseite – dieselben Klassen wie SettingsSection.vue im
// Coach-Backoffice: weiß, 1px Rand, großer Radius, bewusst ohne Schatten.
// padded=false für Karten mit randlosem Bildkopf (Coach-Karte auf der Startseite).
const { padded = true } = defineProps<{ padded?: boolean }>();
</script>

<template>
  <div
    class="rounded-xl border border-default bg-white dark:bg-neutral-900 overflow-hidden"
    :class="padded ? 'p-6 sm:p-7' : ''"
  >
    <slot />
  </div>
</template>
