<template>
  <div class="min-h-screen flex flex-col bg-(--ui-bg-muted)">
    <header class="flex flex-col items-center gap-2 pt-10 pb-2">
      <UIcon name="i-lucide-video" class="size-8 text-primary" />
      <span class="font-serif text-2xl text-(--ui-text-highlighted)">
        Hx<span class="text-primary">Room</span>
      </span>
    </header>

    <main class="flex flex-1 items-center justify-center px-4 pb-12">
      <slot />
    </main>

    <footer class="py-6 text-center text-xs text-(--ui-text-muted)">
      <NuxtLink to="https://hxroom.de/impressum" class="hover:underline">Impressum</NuxtLink>
      <span class="mx-1.5">·</span>
      <NuxtLink to="https://hxroom.de/datenschutz" class="hover:underline">Datenschutz</NuxtLink>
    </footer>
  </div>
</template>
