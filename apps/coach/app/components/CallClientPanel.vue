<script setup lang="ts">
import type { CallAccessResponse } from '@hxroom/shared'

// Kontext zum Klienten, während das Gespräch läuft: Wer sitzt da, wie oft war er schon da,
// was war letztes Mal Thema. Erspart den Griff zur Klientenakte in einem zweiten Tab.

const props = defineProps<{ call: CallAccessResponse }>()

// Beispieldaten (doc/poc/videocall-v2.html). CallAccessResponse trägt diese Felder bewusst
// nicht – aus dem Zugangslink soll nicht mehr hervorgehen, als in der Mail des Klienten
// ohnehin steht. Für den Prototyp stehen sie hier fest; die Anbindung braucht einen eigenen
// Endpunkt und ist ein späterer Schritt.
const SAMPLE = {
  email: 'markus.kellner@example.de',
  sessionNumber: 4,
  plan: 'Pro Plan',
  nextAppointment: '17.09., 14:00 Uhr',
  clientSince: '20.01.2025',
  transcription: 'noch offen',
  previousSessions: [
    {
      date: '03.02.2025 · 45 Min',
      note: 'Beruflicher Neustart besprochen. Übung: tägl. Journaling für zwei Wochen. Reaktion sehr positiv.',
    },
    {
      date: '20.01.2025 · 60 Min',
      note: 'Erste Sitzung. Ziele definiert: Selbstvertrauen, Work-Life-Balance. Gute Offenheit.',
    },
  ],
}

const initials = computed(() => clientInitials(props.call.clientName))
const durationLabel = computed(() => {
  const minutes = Math.round((new Date(props.call.end).getTime() - new Date(props.call.start).getTime()) / 60_000)
  return `${minutes} Min.`
})
</script>

<template>
  <div class="flex flex-col gap-5">
    <!-- Ohne diesen Hinweis wirken die Beispielwerte im echten Ablauf wie echte Angaben –
         dort steht der Name des tatsächlichen Klienten neben einer erfundenen Mailadresse. -->
    <UAlert
      icon="i-lucide-flask-conical"
      color="warning"
      variant="subtle"
      :ui="{ description: 'text-xs' }"
      description="Bis auf Name und Angebot sind die Angaben hier Beispielwerte – die Anbindung fehlt noch."
    />

    <div class="flex items-center gap-3">
      <span class="size-11 rounded-full bg-primary/10 text-primary font-medium flex items-center justify-center shrink-0">
        {{ initials }}
      </span>
      <div class="min-w-0">
        <h2 class="text-sm font-medium text-highlighted truncate">{{ call.clientName }}</h2>
        <p class="text-xs text-muted truncate">{{ SAMPLE.email }}</p>
      </div>
    </div>

    <div class="flex flex-wrap gap-1.5">
      <UBadge color="primary" variant="subtle" size="sm" :label="`Sitzung ${SAMPLE.sessionNumber}`" />
      <UBadge color="neutral" variant="subtle" size="sm" :label="durationLabel" />
      <UBadge color="neutral" variant="subtle" size="sm" :label="SAMPLE.plan" />
    </div>

    <USeparator />

    <dl class="text-xs">
      <div class="flex items-center justify-between gap-3 py-2 border-b border-default">
        <dt class="text-muted">Angebot</dt>
        <dd class="text-toned text-right truncate">{{ call.offerName }}</dd>
      </div>
      <div class="flex items-center justify-between gap-3 py-2 border-b border-default">
        <dt class="text-muted">Nächster Termin</dt>
        <dd class="text-toned text-right">{{ SAMPLE.nextAppointment }}</dd>
      </div>
      <div class="flex items-center justify-between gap-3 py-2 border-b border-default">
        <dt class="text-muted">Klient seit</dt>
        <dd class="text-toned text-right">{{ SAMPLE.clientSince }}</dd>
      </div>
      <div class="flex items-center justify-between gap-3 py-2 border-b border-default">
        <dt class="text-muted">Transkription</dt>
        <dd class="text-warning text-right">{{ SAMPLE.transcription }}</dd>
      </div>
      <div class="flex items-center justify-between gap-3 py-2">
        <dt class="text-muted">Datenschutz</dt>
        <dd class="text-primary text-right">AVV vorhanden · Server DE</dd>
      </div>
    </dl>

    <div>
      <h3 class="text-sm font-medium text-highlighted mb-2">Frühere Sitzungen</h3>
      <div class="flex flex-col gap-2">
        <div
          v-for="session in SAMPLE.previousSessions"
          :key="session.date"
          class="rounded-lg border border-default bg-white dark:bg-neutral-900 px-3 py-2.5"
        >
          <p class="text-xs text-dimmed mb-1">{{ session.date }}</p>
          <p class="text-xs text-muted leading-relaxed">{{ session.note }}</p>
        </div>
      </div>
    </div>

    <p class="text-xs text-dimmed leading-relaxed rounded-lg border border-dashed border-default px-3 py-2.5">
      Hier stehen nur deine eigenen Notizen aus früheren Terminen. Den Verlauf dieser Sitzung
      findest du im Chat.
    </p>
  </div>
</template>
