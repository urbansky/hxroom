<script setup lang="ts">
defineProps<{
  icon: string
  label: string
  value: string
  /** Zweite Zeile unter dem Wert, z. B. "3 mit anstehendem Termin". */
  hint?: string | null
  to?: string
}>()
</script>

<template>
  <!-- Kein UCard: die Kartenflächen im Backoffice sind durchgängig
       bg-white/neutral-900 mit border-default (siehe SettingsSection). -->
  <!-- items-start, nicht items-center: die Kacheln haben je nach Zusatzzeile zwei oder
       drei Zeilen. Zentriert säße der Text der zweizeiligen Kachel tiefer als bei ihren
       Nachbarn, oben ausgerichtet liegen Label und Wert über alle Kacheln auf einer Linie. -->
  <component
    :is="to ? 'NuxtLink' : 'div'"
    :to="to"
    class="flex items-start gap-4 p-4 rounded-xl border border-default bg-white dark:bg-neutral-900"
    :class="to ? 'transition-colors hover:border-accented' : ''"
  >
    <span class="size-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
      <UIcon :name="icon" class="size-5 text-primary" />
    </span>

    <!-- Kein uppercase/tracking auf dem Label: es wäre die einzige Stelle der Seite mit
         Versalien und stünde quer zum ruhigen Satz der übrigen Karten. -->
    <span class="flex-1 min-w-0">
      <span class="block text-sm text-muted">{{ label }}</span>
      <span class="block font-medium text-highlighted truncate">{{ value }}</span>
      <span v-if="hint" class="block text-sm text-muted truncate">{{ hint }}</span>
    </span>
  </component>
</template>
