<template>
  <div class="bg-(--ui-bg) text-(--ui-text) min-h-screen antialiased">
    <div class="noise" />
    <div class="glow-hero" />

    <nav class="fixed top-0 left-0 right-0 z-100 flex items-center justify-between px-6 lg:px-12 h-17 bg-(--ui-bg)/70 backdrop-blur-xl border-b border-(--ui-border)">
      <SiteLogo />
      <div class="flex items-center gap-6">
        <NuxtLink to="/blog" class="text-sm text-(--ui-text-muted) hover:text-(--ui-text) transition-colors no-underline">
          Blog
        </NuxtLink>
        <NuxtLink to="/" class="text-sm text-(--ui-text-muted) hover:text-(--ui-text) transition-colors no-underline">
          Zurück zur Startseite
        </NuxtLink>
      </div>
    </nav>

    <slot />

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
</style>
