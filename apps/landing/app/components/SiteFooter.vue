<template>
  <footer class="relative z-1 border-t border-(--ui-border) px-6 lg:px-12 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
    <span class="text-xs text-(--ui-text-dimmed)">© 2026 HxRoom · Stefan Urbansky · hxcode.io</span>
    <div class="flex items-center gap-6">
      <NuxtLink to="/impressum" class="text-xs text-(--ui-text-dimmed) hover:text-(--ui-text-muted) transition-colors no-underline">Impressum</NuxtLink>
      <NuxtLink to="/datenschutz" class="text-xs text-(--ui-text-dimmed) hover:text-(--ui-text-muted) transition-colors no-underline">Datenschutz</NuxtLink>
      <a href="mailto:kontakt@hxroom.de" class="text-xs text-(--ui-text-dimmed) hover:text-(--ui-text-muted) transition-colors no-underline">Kontakt</a>
      <UColorModeButton size="xs" />
    </div>
  </footer>
</template>
