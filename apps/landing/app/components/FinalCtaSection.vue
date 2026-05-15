<script setup lang="ts">
const content = {
  headlineMain: 'Sag mir, dass du',
  headlineEm: 'dabei sein willst',
  headlineEnd: '.',
  sub: 'Den Rest melde ich dir, sobald es losgeht. Eine E-Mail pro Meilenstein – nicht mehr.',
  cta: 'Benachrichtigt werden',
}
</script>

<template>
  <section class="relative z-1 pt-[140px] pb-[100px] px-12 text-center max-sm:py-20 max-sm:px-6">
    <div class="section-divider" />

    <h2 class="font-serif text-[clamp(34px,4.5vw,50px)] font-light text-(--color-cream) leading-[1.15] mb-5 max-w-[700px] mx-auto">
      {{ content.headlineMain }} <em class="italic text-gold-300">{{ content.headlineEm }}</em>{{ content.headlineEnd }}
    </h2>
    <p class="text-[16px] text-(--ui-text-muted) max-w-[480px] mx-auto mb-10 leading-[1.6]">
      {{ content.sub }}
    </p>

    <div class="flex justify-center">
      <NewsletterCard :cta="content.cta" />
    </div>
  </section>
</template>

<style scoped>
.section-divider {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 80%;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--ui-border), transparent);
}
</style>
