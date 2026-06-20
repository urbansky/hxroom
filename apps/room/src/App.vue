<script setup lang="ts">
import { provide } from 'vue';
import { useCoach, COACH_KEY } from './composables/useCoach';
import NotFoundView from './views/NotFoundView.vue';

const { coach, loading, notFound } = useCoach();
provide(COACH_KEY, coach);
</script>

<template>
  <div class="bg-(--ui-bg) text-(--ui-text) min-h-screen antialiased">
    <NotFoundView v-if="notFound" />
    <router-view v-else-if="!loading" />
  </div>
</template>

<style>
html {
  scroll-behavior: smooth;
}
</style>
