<script setup lang="ts">
/**
 * Einrichtungs-Checkliste (doc/funktionen/backoffice-coach.md, Funktion 1.04).
 * Sie verschwindet, sobald alle Schritte erledigt sind – ohne Schließen-Knopf:
 * ein weggeklickter Schritt wäre ein vergessener Schritt, und die Liste ist nach
 * dem Einrichten ohnehin für immer weg.
 */
const props = defineProps<{ steps: OnboardingStep[] }>()

const doneCount = computed(() => props.steps.filter(s => s.done).length)
const isComplete = computed(() => doneCount.value === props.steps.length)
const nextStep = computed(() => props.steps.find(s => !s.done) ?? null)
</script>

<template>
  <section
    v-if="!isComplete"
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
