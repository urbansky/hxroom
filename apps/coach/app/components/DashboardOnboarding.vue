<script setup lang="ts">
/**
 * Einrichtungs-Checkliste (doc/funktionen/backoffice-coach.md, Funktion 1.04) und die
 * Erfolgsmeldung, die an ihre Stelle tritt, sobald alle Schritte erledigt sind.
 *
 * Die Liste selbst hat bewusst keinen Schließen-Knopf: ein weggeklickter Schritt wäre
 * ein vergessener Schritt. Der Schließen-Knopf gehört zur Erfolgsmeldung – die ist
 * einmalig und darf verschwinden, sobald der Coach sie gelesen hat.
 */
const props = defineProps<{
  steps: OnboardingStep[]
  /** Zeitpunkt, an dem die Erfolgsmeldung weggeklickt wurde; null = noch nicht gesehen. */
  celebratedAt: string | null
  coachName?: string | null
  bookingPageUrl?: string | null
}>()

const emit = defineEmits<{ dismiss: [] }>()

const { copyBookingLink } = useBookingLink()

const doneCount = computed(() => props.steps.filter(s => s.done).length)
const isComplete = computed(() => doneCount.value === props.steps.length)
const nextStep = computed(() => props.steps.find(s => !s.done) ?? null)

const showCelebration = computed(() => isComplete.value && !props.celebratedAt)

// Vorname statt vollem Namen: die Meldung soll klingen wie ein Zuruf, nicht wie eine
// Anrede. Ohne Namen bleibt der Satz für sich stehen.
const firstName = computed(() => props.coachName?.trim().split(/\s+/)[0] ?? null)
</script>

<template>
  <section
    v-if="showCelebration"
    class="celebration relative flex flex-col items-center gap-4 p-6 sm:p-8 rounded-xl border border-default text-center bg-gradient-to-br from-sage-50 via-white to-gold-50 dark:from-sage-950 dark:via-neutral-900 dark:to-neutral-900"
  >
    <UButton
      icon="i-lucide-x"
      color="neutral"
      variant="ghost"
      size="sm"
      aria-label="Erfolgsmeldung schließen"
      class="absolute top-3 right-3"
      @click="emit('dismiss')"
    />

    <span class="celebration-mark size-14 rounded-full bg-primary/10 flex items-center justify-center">
      <UIcon name="i-lucide-check" class="size-7 text-primary" />
    </span>

    <div class="flex flex-col gap-2 max-w-lg">
      <h2 class="font-serif text-2xl sm:text-3xl text-highlighted">
        Dein Raum steht<template v-if="firstName">, {{ firstName }}</template>.
      </h2>
      <p class="text-muted text-balance">
        Buchungsseite, Angebot und Zeiten sind eingerichtet. Ab jetzt kümmert sich HxRoom um
        den Rahmen – du dich um die Gespräche.
      </p>
    </div>

    <div class="flex flex-wrap items-center justify-center gap-2">
      <UButton
        v-if="bookingPageUrl"
        label="Buchungslink teilen"
        icon="i-lucide-link"
        color="primary"
        size="sm"
        @click="copyBookingLink(bookingPageUrl)"
      />
      <UButton
        to="/bookings"
        label="Zum Kalender"
        trailing-icon="i-lucide-arrow-right"
        color="primary"
        variant="ghost"
        size="sm"
      />
    </div>
  </section>

  <section
    v-else-if="!isComplete"
    class="flex flex-col gap-5 p-6 sm:p-7 rounded-xl border border-default bg-white dark:bg-neutral-900"
  >
    <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <h2 class="font-bold">Einrichtung abschließen</h2>
      <span class="text-sm text-muted tabular-nums">
        {{ doneCount }} von {{ steps.length }} erledigt
      </span>
    </div>

    <UProgress :model-value="doneCount" :max="steps.length" size="sm" />

    <ul class="flex flex-col gap-1">
      <li v-for="step in steps" :key="step.key">
        <NuxtLink
          :to="step.to"
          class="flex items-center gap-3 -mx-2 px-2 py-2 rounded-lg transition-colors hover:bg-muted"
        >
          <UIcon
            :name="step.done ? 'i-lucide-circle-check' : 'i-lucide-circle-dashed'"
            class="size-5 shrink-0"
            :class="step.done ? 'text-primary' : 'text-muted'"
          />
          <span class="flex-1 min-w-0">
            <span
              class="block text-sm font-medium truncate"
              :class="step.done ? 'text-muted line-through' : 'text-highlighted'"
            >
              {{ step.label }}
            </span>
            <span v-if="!step.done" class="block text-sm text-muted truncate">{{ step.description }}</span>
          </span>
          <UIcon v-if="!step.done" name="i-lucide-chevron-right" class="size-4 text-muted shrink-0" />
        </NuxtLink>
      </li>
    </ul>

    <div v-if="nextStep">
      <UButton
        :to="nextStep.to"
        :label="nextStep.label"
        trailing-icon="i-lucide-arrow-right"
        color="primary"
        size="sm"
      />
    </div>
  </section>
</template>

<style scoped>
/* Eigene Keyframes: Nuxt UI liefert zwar fade-in/scale-in mit, registriert sie aber
   nicht als Tailwind-Utilities. */
@keyframes celebration-rise {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes celebration-pop {
  0%   { opacity: 0; transform: scale(0.8); }
  60%  { opacity: 1; transform: scale(1.06); }
  100% { opacity: 1; transform: scale(1); }
}

.celebration {
  animation: celebration-rise 0.4s ease-out both;
}

.celebration-mark {
  animation: celebration-pop 0.5s ease-out 0.15s both;
}

@media (prefers-reduced-motion: reduce) {
  .celebration,
  .celebration-mark {
    animation: none;
  }
}
</style>
