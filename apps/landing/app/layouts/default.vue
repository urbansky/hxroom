<script setup lang="ts">
import { Logo } from '@hxroom/ui'

const { demoUrl } = useLandingLinks()

// Sprungmarken der Startseite. Absolut („/#…“), damit sie auch von Impressum und
// Datenschutz aus funktionieren, falls diese das Layout einmal teilen.
const anchors = [
  { label: 'So funktioniert’s', href: '/#so-funktionierts' },
  { label: 'Für wen', href: '/#fuer-wen' },
  { label: 'Über mich', href: '/#ueber-mich' },
  { label: 'Fragen', href: '/#fragen' },
]
</script>

<template>
  <div class="bg-(--ui-bg) text-(--ui-text) min-h-screen antialiased">
    <!-- Noise overlay -->
    <div class="noise" />
    <!-- Ambient Glows -->
    <div class="glow-hero" />
    <div class="glow-mid" />

    <!-- Nav -->
    <nav class="fixed top-0 left-0 right-0 z-100 flex items-center justify-between gap-6 px-6 lg:px-12 h-17 bg-(--ui-bg)/75 backdrop-blur-xl border-b border-(--ui-border)">
      <!-- Logo ist selbst ein Link auf „/“, deshalb nicht noch einmal in einen Link packen. -->
      <Logo class="no-underline" />
      <div class="flex items-center gap-8">
        <ul class="hidden lg:flex items-center gap-7">
          <li v-for="item in anchors" :key="item.href">
            <a :href="item.href" class="text-[14px] text-(--ui-text-muted) hover:text-(--ui-text) transition-colors no-underline">{{ item.label }}</a>
          </li>
        </ul>
        <UButton
          :to="demoUrl"
          color="primary"
          size="md"
          icon="i-lucide-calendar-heart"
          label="Vorführung buchen"
          @click="useTrackEvent('demo_click')"
        />
      </div>
    </nav>

    <slot />

    <SiteFooter />
  </div>
</template>

<style>
html { scroll-behavior: smooth; }
</style>

<style scoped>
.noise {
  position: fixed;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E");
  pointer-events: none;
  z-index: 0;
  opacity: 0.6;
}

.glow-hero {
  position: fixed;
  top: -200px;
  left: 50%;
  transform: translateX(-50%);
  width: 1100px;
  height: 700px;
  border-radius: 50%;
  background: radial-gradient(ellipse, rgba(92, 110, 91, 0.08) 0%, transparent 65%);
  pointer-events: none;
  z-index: 0;
}

.glow-mid {
  position: fixed;
  top: 50%;
  right: -200px;
  width: 600px;
  height: 600px;
  border-radius: 50%;
  background: radial-gradient(ellipse, rgba(181, 147, 90, 0.05) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}
</style>

<style>
/* Sprungmarken in der Navigation */
@media (prefers-reduced-motion: no-preference) {
  html { scroll-behavior: smooth; }
}
</style>