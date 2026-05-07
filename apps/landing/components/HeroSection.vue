<script setup lang="ts">
import MockupPreview from './MockupPreview.vue';
</script>

<template>
  <section class="relative z-1 min-h-screen flex flex-col items-center justify-center text-center px-6 lg:px-12 pt-36 lg:pt-40 pb-16 lg:pb-24 overflow-hidden">
    <!-- Eyebrow -->
    <div class="inline-flex items-center gap-2 bg-sage-400/8 border border-sage-400/18 rounded-full px-4 py-1.5 mb-8 animate-fade-up">
      <div class="size-1.5 rounded-full bg-sage-400" />
      <span class="text-[11px] text-sage-700 dark:text-sage-200 tracking-[0.1em] uppercase">Für Coaches & Life Coaches im DACH-Markt</span>
    </div>

    <!-- Headline -->
    <h1 class="font-serif text-5xl lg:text-[88px] font-light leading-[1.04] text-sage-950 dark:text-cream tracking-tight max-w-[900px] mb-7 animate-fade-up animation-delay-100">
      Deine Klienten verdienen<br>mehr als einen <em class="italic text-gold-500 dark:text-gold-300">Zoom-Link.</em>
    </h1>

    <!-- Sub -->
    <p class="text-lg text-(--ui-text-muted) leading-[1.7] max-w-[520px] mb-12 animate-fade-up animation-delay-200">
      HxRoom gibt dir einen gebrandeten digitalen Empfangsraum – von der Buchung bis zur Nachbereitung, vollständig in deinem Namen.
    </p>

    <!-- Actions -->
    <div class="flex items-center gap-3.5 mb-14 animate-fade-up animation-delay-300">
      <UButton size="xl" color="primary" icon="i-lucide-arrow-right" class="shadow-lg shadow-sage-600/30 px-8 py-4">
        Trial starten – kostenlos
      </UButton>
      <UButton size="xl" variant="outline" color="neutral" class="px-7 py-4">
        Wie es funktioniert
      </UButton>
    </div>

    <!-- Trust -->
    <div class="flex flex-wrap items-center justify-center gap-6 animate-fade-up animation-delay-400">
      <div class="flex items-center gap-1.5 text-xs text-(--ui-text-dimmed)">
        <UIcon name="i-lucide-check" class="size-[13px] text-sage-400" />
        Keine Kreditkarte
      </div>
      <div class="w-px h-3.5 bg-(--ui-border) hidden sm:block" />
      <div class="flex items-center gap-1.5 text-xs text-(--ui-text-dimmed)">
        <UIcon name="i-lucide-check" class="size-[13px] text-sage-400" />
        14 Tage alle Features
      </div>
      <div class="w-px h-3.5 bg-(--ui-border) hidden sm:block" />
      <div class="flex items-center gap-1.5 text-xs text-(--ui-text-dimmed)">
        <UIcon name="i-lucide-check" class="size-[13px] text-sage-400" />
        DSGVO · Server Deutschland
      </div>
      <div class="w-px h-3.5 bg-(--ui-border) hidden sm:block" />
      <div class="flex items-center gap-1.5 text-xs text-(--ui-text-dimmed)">
        <UIcon name="i-lucide-check" class="size-[13px] text-sage-400" />
        Kein Account für Klienten
      </div>
    </div>

    <!-- Mockup -->
    <MockupPreview class="mt-18" />
  </section>
</template>

<style scoped>
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-up {
  animation: fadeUp 0.7s ease both;
}

.animation-delay-100 { animation-delay: 0.1s; }
.animation-delay-200 { animation-delay: 0.2s; }
.animation-delay-300 { animation-delay: 0.3s; }
.animation-delay-400 { animation-delay: 0.4s; }
</style>
