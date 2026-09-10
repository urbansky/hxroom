<script setup lang="ts">
// Eigenes Layout für den Call-Screen: kein UDashboardGroup, keine Seitenleiste.
//
// Der Coach ist hier im Gespräch, nicht in der Verwaltung – Navigation neben dem Bild
// lädt nur zum Wegklicken ein. Die Notiz-Seitenleiste sitzt innerhalb des Call-Screens
// (doc/technisches-konzept.md §8).
//
// h-dvh statt min-h-screen: Der Call-Screen teilt die Fensterhöhe fest auf Kopfzeile,
// Bühne und Steuerleiste auf. Mit min-h-screen hätte sein h-full keinen Bezug und die
// Bühne bekäme die Höhe ihres Inhalts. Die Zweige davor – Warteraum, Fehler, Abschluss –
// scrollen dafür selbst, siehe pages/call/[bookingId].vue.
</script>

<template>
  <div class="h-dvh flex flex-col overflow-hidden bg-default">
    <slot />
  </div>
</template>
