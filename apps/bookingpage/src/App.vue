<script setup lang="ts">
import { provide } from 'vue';
import { useCoach, COACH_KEY } from './composables/useCoach';
import { useOffers, OFFERS_KEY } from './composables/useOffers';
import NotFoundView from './views/NotFoundView.vue';

const { coach, loading, notFound } = useCoach();
provide(COACH_KEY, coach);

provide(OFFERS_KEY, useOffers());
</script>

<template>
  <!-- UApp liefert das Portal-Ziel für Overlays (u. a. das Mobilmenü von UHeader) sowie
       Tooltip- und Toast-Provider. Farben kommen aus der body-Basisregel des Themes. -->
  <UApp>
    <div class="min-h-screen antialiased">
      <NotFoundView v-if="notFound" />
      <router-view v-else-if="!loading" />
    </div>
  </UApp>
</template>
