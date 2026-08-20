<script setup lang="ts">
// Eigenes Layout für den Call-Screen: kein UDashboardGroup, keine Seitenleiste.
//
// Der Coach ist hier im Gespräch, nicht in der Verwaltung – Navigation neben dem Bild
// lädt nur zum Wegklicken ein. Später entsteht daneben die Notiz-Seitenleiste, die den
// Platz ohnehin braucht (doc/technisches-konzept.md §8).
</script>

<template>
  <div class="min-h-screen flex flex-col bg-default">
    <slot />
  </div>
</template>
