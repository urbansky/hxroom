<script setup lang="ts">
import HeroSection from '@/components/HeroSection.vue';
import QuoteBand from '@/components/QuoteBand.vue';
import FeaturesSection from '@/components/FeaturesSection.vue';
import ComparisonSection from '@/components/ComparisonSection.vue';
import StepsSection from '@/components/StepsSection.vue';
import TestimonialsSection from '@/components/TestimonialsSection.vue';
import PricingSection from '@/components/PricingSection.vue';
import TrustBand from '@/components/TrustBand.vue';
import CtaSection from '@/components/CtaSection.vue';
</script>

<template>
  <div class="bg-(--ui-bg) text-(--ui-text) min-h-screen antialiased">
    <!-- Ambient Glows -->
    <div class="glow-hero" />
    <div class="glow-mid" />

    <!-- Nav -->
    <nav class="fixed top-0 left-0 right-0 z-100 flex items-center justify-between px-6 lg:px-12 h-17 bg-(--ui-bg)/70 backdrop-blur-xl border-b border-(--ui-border)">
      <a href="/" class="flex items-center gap-2.5 no-underline">
        <div class="size-9 rounded-[10px] bg-gradient-to-br from-sage-400 to-sage-600 flex items-center justify-center font-serif text-lg text-white/92 font-semibold shrink-0">
          H
        </div>
        <span class="font-serif text-[22px] font-semibold text-gold-700 dark:text-gold-200 tracking-wide">HxRoom</span>
      </a>
      <div class="hidden sm:flex items-center gap-8">
        <a href="#features" class="text-[13px] text-(--ui-text-muted) hover:text-(--ui-text) transition-colors tracking-wide no-underline">Features</a>
        <a href="#vergleich" class="text-[13px] text-(--ui-text-muted) hover:text-(--ui-text) transition-colors tracking-wide no-underline">Vergleich</a>
        <a href="#preise" class="text-[13px] text-(--ui-text-muted) hover:text-(--ui-text) transition-colors tracking-wide no-underline">Preise</a>
        <a href="#stimmen" class="text-[13px] text-(--ui-text-muted) hover:text-(--ui-text) transition-colors tracking-wide no-underline">Stimmen</a>
      </div>
      <div class="flex items-center gap-3">
        <UButton variant="outline" color="neutral" size="sm" class="hidden sm:inline-flex">Anmelden</UButton>
        <UButton color="primary" size="sm" icon="i-lucide-arrow-right">15 Tage kostenlos</UButton>
      </div>
    </nav>

    <HeroSection />
    <QuoteBand />
    <FeaturesSection />
    <ComparisonSection />
    <StepsSection />
    <TestimonialsSection />
    <PricingSection />
    <TrustBand />
    <CtaSection />

    <!-- Footer -->
    <footer class="relative z-1 border-t border-(--ui-border) px-6 lg:px-12 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
      <div class="flex items-center gap-2.5">
        <div class="size-7 rounded-[7px] bg-gradient-to-br from-sage-400 to-sage-600 flex items-center justify-center font-serif text-sm text-white/90 font-semibold shrink-0">
          H
        </div>
        <span class="font-serif text-[17px] font-semibold text-gold-700 dark:text-gold-200">HxRoom</span>
        <span class="text-[11px] text-(--ui-text-dimmed)">· Einfach. Professionell. Deins.</span>
      </div>
      <div class="flex flex-wrap items-center justify-center gap-6">
        <a href="#features" class="text-xs text-(--ui-text-dimmed) hover:text-(--ui-text-muted) transition-colors no-underline">Features</a>
        <a href="#preise" class="text-xs text-(--ui-text-dimmed) hover:text-(--ui-text-muted) transition-colors no-underline">Preise</a>
        <a href="#" class="text-xs text-(--ui-text-dimmed) hover:text-(--ui-text-muted) transition-colors no-underline">Datenschutz</a>
        <a href="#" class="text-xs text-(--ui-text-dimmed) hover:text-(--ui-text-muted) transition-colors no-underline">Impressum</a>
        <a href="#" class="text-xs text-(--ui-text-dimmed) hover:text-(--ui-text-muted) transition-colors no-underline">AGB</a>
        <a href="#" class="text-xs text-(--ui-text-dimmed) hover:text-(--ui-text-muted) transition-colors no-underline">Blog</a>
      </div>
      <div class="flex items-center gap-3">
        <UColorModeButton size="xs" />
        <UBadge color="primary" variant="subtle" size="sm">DACH</UBadge>
        <span class="text-xs text-(--ui-text-dimmed)">&copy; 2025 HxRoom</span>
      </div>
    </footer>
  </div>
</template>

<style>
html {
  scroll-behavior: smooth;
}
</style>

<style scoped>
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
