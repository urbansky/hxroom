<template>
  <div class="min-h-screen flex flex-col items-center justify-center gap-6 px-6 text-center">
    <div class="size-16 rounded-2xl bg-(--ui-bg-elevated) border border-(--ui-border) flex items-center justify-center">
      <UIcon name="i-lucide-search-x" class="size-7 text-(--ui-text-dimmed)" />
    </div>

    <div class="flex flex-col gap-2 max-w-sm">
      <h1 class="font-serif text-2xl font-light text-sage-950 dark:text-cream">Seite nicht gefunden</h1>
      <p class="text-sm text-(--ui-text-muted) leading-relaxed">
        Dieser Coach-Bereich existiert nicht oder ist nicht mehr aktiv.
      </p>
    </div>

    <a href="https://hxroom.de" class="text-xs text-(--ui-text-dimmed) hover:text-(--ui-text-muted) transition-colors no-underline">
      hxroom.de
    </a>
  </div>
</template>
