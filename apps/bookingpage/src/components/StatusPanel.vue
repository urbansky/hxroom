<script setup lang="ts">
// Zustandsanzeige für Erfolg, Hinweis und Fehler: Icon im getönten Kreis, Serif-Überschrift,
// erklärender Satz. Deckt "Termin bestätigt", "Termin vorgemerkt", "Absage nicht möglich"
// und die Leerzustände ab – vorher stand dieser Block sechsmal in den Views.
const { icon, title, description, tone = 'success' } = defineProps<{
  icon: string;
  title: string;
  description?: string;
  /** warning für abgelaufene/ungültige Links, neutral für Leerzustände. */
  tone?: 'success' | 'warning' | 'neutral';
}>();

const toneClasses = {
  success: { circle: 'bg-primary/10', icon: 'text-primary' },
  warning: { circle: 'bg-warning/10', icon: 'text-warning' },
  neutral: { circle: 'bg-elevated', icon: 'text-dimmed' },
} as const;
</script>

<template>
  <div class="flex flex-col items-center text-center gap-4">
    <div class="size-12 rounded-full flex items-center justify-center" :class="toneClasses[tone].circle">
      <UIcon :name="icon" class="size-6" :class="toneClasses[tone].icon" />
    </div>
    <div>
      <h1 class="font-serif text-2xl text-highlighted mb-1.5">{{ title }}</h1>
      <p v-if="description" class="text-sm text-muted leading-relaxed">{{ description }}</p>
      <slot name="description" />
    </div>
    <slot />
  </div>
</template>
