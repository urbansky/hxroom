<script setup lang="ts">
import { Logo } from '@hxroom/ui'

const { demoUrl, registerUrl, loginUrl } = useLandingLinks()

const linkClass = 'text-[14px] text-(--ui-text-muted) hover:text-(--ui-text) transition-colors no-underline'
</script>

<template>
  <footer class="relative z-1 border-t border-(--ui-border) px-6 lg:px-12 pt-14 pb-10">
    <div class="max-w-[1180px] mx-auto grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] gap-10 max-md:grid-cols-2">
      <div class="max-md:col-span-2">
        <Logo />
        <p class="mt-4 text-[14px] text-(--ui-text-muted) leading-[1.6] max-w-[320px]">
          Der Videocall-Raum für Coaches – unter deinem Namen, mit Servern in Deutschland.
        </p>
      </div>

      <nav aria-label="Produkt">
        <p class="text-[11px] tracking-[0.14em] uppercase text-(--ui-text-dimmed) mb-4">Produkt</p>
        <ul class="flex flex-col gap-2.5">
          <li><a :href="demoUrl" :class="linkClass">Vorführung buchen</a></li>
          <li><a :href="registerUrl" :class="linkClass">Kostenlos ausprobieren</a></li>
          <li><a :href="loginUrl" :class="linkClass">Anmelden</a></li>
        </ul>
      </nav>

      <nav aria-label="Rechtliches">
        <p class="text-[11px] tracking-[0.14em] uppercase text-(--ui-text-dimmed) mb-4">Rechtliches</p>
        <ul class="flex flex-col gap-2.5">
          <li><NuxtLink to="/impressum" :class="linkClass">Impressum</NuxtLink></li>
          <li><NuxtLink to="/datenschutz" :class="linkClass">Datenschutz</NuxtLink></li>
          <li><a href="mailto:kontakt@hxroom.de" :class="linkClass">Kontakt</a></li>
        </ul>
      </nav>
    </div>

    <div class="max-w-[1180px] mx-auto mt-12 pt-6 border-t border-(--ui-border) flex items-center justify-between gap-4">
      <span class="text-xs text-(--ui-text-dimmed)">© 2026 HxRoom · Stefan Urbansky · hxcode.io</span>
      <UColorModeButton size="xs" />
    </div>
  </footer>
</template>
