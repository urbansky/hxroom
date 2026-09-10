<script setup lang="ts">
import type { CallAccessResponse } from '@hxroom/shared'

// Die Bühne: großes Bild des Klienten, kleines eigenes Bild oben rechts.
//
// Prototyp – es wird kein Video übertragen und keins nachgestellt. Beide Flächen bleiben
// neutral und tragen nur die Zustände, die im Gespräch zählen: wer da ist, wer stumm ist,
// wessen Hintergrund weichgezeichnet wird, ob gerade geteilt wird.

const props = defineProps<{
  call: CallAccessResponse
  camOn: boolean
  micOn: boolean
  coachBlur: boolean
  clientBlur: boolean
  sharing: boolean
  clientMuted: boolean
}>()

defineEmits<{ 'stop-sharing': [] }>()

const initials = computed(() => clientInitials(props.call.clientName))
</script>

<template>
  <div class="relative h-full w-full overflow-hidden bg-muted">
    <!-- Läuft eine Freigabe, muss das ohne Suchen erkennbar sein: Wer seinen Bildschirm
         teilt, ohne es zu merken, zeigt im Zweifel die Klientenakte des Nächsten. -->
    <div
      v-if="sharing"
      class="absolute inset-x-0 top-0 z-20 flex items-center justify-center gap-2 px-3 py-1.5 bg-primary/10 border-b border-primary/20"
    >
      <UIcon name="i-lucide-monitor-up" class="size-3.5 text-primary shrink-0" />
      <span class="text-xs text-primary truncate">Du teilst deinen Bildschirm</span>
      <UButton color="primary" variant="link" size="xs" class="p-0" label="Beenden" @click="$emit('stop-sharing')" />
    </div>

    <!-- Platzhalter der Videofläche. Hier hängt sich in B5 die LiveKit-Bühne ein. -->
    <div class="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6">
      <span class="size-20 rounded-full bg-primary/10 text-primary font-medium text-2xl flex items-center justify-center">
        {{ initials }}
      </span>
      <p class="text-sm text-dimmed">Videobild von {{ call.clientName }}</p>
    </div>

    <!-- Name und Zustand des Klienten, unten links wie im Entwurf. -->
    <div class="absolute bottom-4 left-4 flex items-center gap-2">
      <div class="flex items-center gap-2 rounded-lg border border-default bg-default/85 backdrop-blur px-2.5 py-1.5">
        <span class="size-5 rounded-full bg-primary/10 text-primary text-[0.625rem] font-medium flex items-center justify-center">
          {{ initials }}
        </span>
        <span class="text-xs text-toned">{{ call.clientName }}</span>
      </div>

      <UTooltip v-if="clientMuted" text="Von dir stummgeschaltet">
        <span class="size-7 rounded-full bg-error/10 flex items-center justify-center">
          <UIcon name="i-lucide-mic-off" class="size-3.5 text-error" />
        </span>
      </UTooltip>

      <UBadge
        v-if="clientBlur"
        icon="i-lucide-aperture"
        color="neutral"
        variant="subtle"
        size="sm"
        :label="`Hintergrund von ${call.clientName.split(' ')[0]} weichgezeichnet`"
        class="hidden sm:inline-flex"
      />
    </div>

    <!-- Eigenes Bild. Klein, oben rechts – der Coach soll sich nicht selbst anschauen. -->
    <div
      class="absolute right-4 w-24 sm:w-44 aspect-video rounded-lg overflow-hidden border border-accented bg-elevated shadow-sm transition-all"
      :class="sharing ? 'top-12' : 'top-4'"
    >
      <div class="absolute inset-0 flex items-center justify-center">
        <template v-if="camOn">
          <UIcon name="i-lucide-user" class="size-6 text-dimmed" />
        </template>
        <span v-else class="text-[0.625rem] sm:text-xs text-dimmed">Kamera aus</span>
      </div>

      <span
        v-if="!micOn"
        class="absolute top-1.5 right-1.5 size-4 rounded-full bg-error flex items-center justify-center"
      >
        <UIcon name="i-lucide-mic-off" class="size-2.5 text-inverted" />
      </span>

      <span
        v-if="coachBlur"
        class="absolute top-1.5 left-1.5 size-4 rounded-full bg-primary flex items-center justify-center"
        title="Dein Hintergrund wird weichgezeichnet"
      >
        <UIcon name="i-lucide-aperture" class="size-2.5 text-inverted" />
      </span>

      <span class="absolute bottom-1 left-2 text-[0.625rem] text-dimmed">Du</span>
    </div>
  </div>
</template>
