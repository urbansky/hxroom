<script setup lang="ts">
const pillars = [
  { icon: 'i-lucide-shield', title: 'DSGVO-konform', sub: 'AVV automatisch inklusive' },
  { icon: 'i-lucide-monitor', title: 'Server Deutschland', sub: 'Hetzner / AWS Frankfurt' },
  { icon: 'i-lucide-user', title: 'Kein Login für Klienten', sub: 'Link klicken – fertig' },
  { icon: 'i-lucide-phone', title: 'Menschlicher Support', sub: 'Auf Deutsch · DACH-fokussiert' },
];
</script>

<template>
  <div class="relative z-1 bg-white/[0.015] dark:bg-white/[0.015] border-y border-(--ui-border) py-12 px-6 lg:px-12">
    <div class="max-w-[1200px] mx-auto flex flex-wrap items-center justify-center gap-8 lg:gap-16">
      <template v-for="(pillar, i) in pillars" :key="pillar.title">
        <div class="flex items-center gap-3.5">
          <div class="size-[42px] rounded-[11px] bg-sage-400/8 border border-sage-400/14 flex items-center justify-center shrink-0">
            <UIcon :name="pillar.icon" class="size-[18px] text-sage-500" />
          </div>
          <div>
            <div class="text-[13px] font-medium text-(--ui-text)">{{ pillar.title }}</div>
            <div class="text-[11px] text-(--ui-text-dimmed)">{{ pillar.sub }}</div>
          </div>
        </div>
        <div v-if="i < pillars.length - 1" class="hidden lg:block w-px h-10 bg-(--ui-border)" />
      </template>
    </div>
  </div>
</template>
