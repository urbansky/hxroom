<template>
  <div class="bg-(--ui-bg) text-(--ui-text) min-h-screen antialiased">
    <!-- Noise overlay -->
    <div class="noise" />
    <!-- Ambient Glows -->
    <div class="glow-hero" />
    <div class="glow-mid" />

    <!-- Nav -->
    <nav class="fixed top-0 left-0 right-0 z-100 flex items-center justify-between px-6 lg:px-12 h-17 bg-(--ui-bg)/70 backdrop-blur-xl border-b border-(--ui-border)">
      <SiteLogo />
      <div class="flex items-center gap-4">
        <!-- <NuxtLink to="/blog" class="hidden md:inline text-sm text-(--ui-text-muted) hover:text-(--ui-text) transition-colors no-underline">
          Blog
        </NuxtLink> -->
        <span class="hidden md:inline-flex items-center gap-2 text-[11px] text-sage-600 dark:text-sage-200 tracking-[0.1em] uppercase px-3.5 py-1.5 border border-sage-400/20 bg-sage-400/6 rounded-full">
          <span class="size-1.5 rounded-full bg-sage-400 animate-pulse" />
          In Entstehung
        </span>
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