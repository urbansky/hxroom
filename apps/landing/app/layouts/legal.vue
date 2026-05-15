<template>
  <div class="bg-(--ui-bg) text-(--ui-text) min-h-screen antialiased flex flex-col">
    <div class="noise" />

    <!-- Nav: Brand-Logo + "Zurück"-Link, kein CTA -->
    <nav class="sticky top-0 z-100 flex items-center justify-between px-6 lg:px-12 h-17 bg-(--ui-bg)/70 backdrop-blur-xl border-b border-(--ui-border)">
      <SiteLogo />
      <NuxtLink
        to="/"
        class="inline-flex items-center gap-1.5 text-[13px] text-(--ui-text-muted) hover:text-(--ui-text-highlighted) hover:bg-(--ui-bg-muted) px-3.5 py-2 rounded-lg transition-colors no-underline"
      >
        ← Zurück
      </NuxtLink>
    </nav>

    <main class="flex-1 relative z-1 px-8 max-md:px-5 pt-20 pb-30 max-md:pt-12 max-md:pb-20">
      <slot />
    </main>

    <SiteFooter />
  </div>
</template>

<style scoped>
.noise {
  position: fixed;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E");
  pointer-events: none;
  z-index: 0;
  opacity: 0.6;
}
</style>
