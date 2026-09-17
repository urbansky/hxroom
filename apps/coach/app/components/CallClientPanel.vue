<script setup lang="ts">
import type { CallAccessResponse, CallClientContext } from '@hxroom/shared'

// Kontext zum Klienten, während das Gespräch läuft: Wer sitzt da, wie oft war er schon da,
// was war letztes Mal Thema. Erspart den Griff zur Klientenakte in einem zweiten Tab.
//
// Nur die Anzeige: Geladen wird in CallScreen.vue, weil der Tab-Wechsel der Seitenleiste
// dieses Panel abbaut. Was es noch nicht gibt (Pakete, Transkription, AVV), steht hier
// bewusst nicht – auch nicht als Beispielwert.

const props = defineProps<{
  call: CallAccessResponse
  /** null, solange geladen wird oder das Laden gescheitert ist */
  context: CallClientContext | null
  loadError: boolean
}>()
defineEmits<{ retry: [] }>()

const client = computed(() => props.context?.client ?? null)
const initials = computed(() => clientInitials(client.value?.name ?? props.call.clientName))
const durationLabel = computed(() => {
  const minutes = Math.round((new Date(props.call.end).getTime() - new Date(props.call.start).getTime()) / 60_000)
  return `${minutes} Min.`
})

const nextSessionLabel = computed(() => {
  const next = props.context?.nextSessionAt
  return next ? `${formatDayHeading(next)}, ${formatTime(next)} Uhr` : 'Keiner geplant'
})

// Notizen sind auf vier Zeilen gekürzt; ein Klick zeigt die ganze.
const expanded = ref(new Set<string>())
function toggle(bookingId: string) {
  const next = new Set(expanded.value)
  if (next.has(bookingId)) next.delete(bookingId)
  else next.add(bookingId)
  expanded.value = next
}
</script>

<template>
  <div class="flex flex-col gap-5">
    <div class="flex items-center gap-3">
      <span class="size-11 rounded-full bg-primary/10 text-primary font-medium flex items-center justify-center shrink-0">
        {{ initials }}
      </span>
      <div class="min-w-0">
        <h2 class="text-sm font-medium text-highlighted truncate">{{ client?.name ?? call.clientName }}</h2>
        <template v-if="client">
          <ULink :to="`mailto:${client.email}`" class="block text-xs text-muted hover:text-primary truncate">{{ client.email }}</ULink>
          <ULink v-if="client.phone" :to="`tel:${client.phone}`" class="block text-xs text-muted hover:text-primary truncate">{{ client.phone }}</ULink>
        </template>
      </div>
    </div>

    <UAlert
      v-if="loadError"
      icon="i-lucide-alert-circle"
      color="error"
      variant="subtle"
      description="Die Angaben zum Klienten konnten nicht geladen werden."
      :actions="[{ label: 'Erneut versuchen', color: 'error', variant: 'outline', onClick: () => $emit('retry') }]"
    />

    <div v-else-if="!context" class="flex flex-col gap-3">
      <USkeleton class="h-5 w-40 rounded" />
      <USkeleton class="h-28 rounded-lg" />
      <USkeleton class="h-20 rounded-lg" />
    </div>

    <template v-else>
      <div class="flex flex-wrap gap-1.5">
        <UBadge v-if="context.sessionNumber" color="primary" variant="subtle" size="sm" :label="`Sitzung ${context.sessionNumber}`" />
        <UBadge color="neutral" variant="subtle" size="sm" :label="durationLabel" />
      </div>

      <USeparator />

      <dl class="text-xs">
        <div class="flex items-center justify-between gap-3 py-2" :class="client && 'border-b border-default'">
          <dt class="text-muted">Angebot</dt>
          <dd class="text-toned text-right truncate">{{ call.offerName }}</dd>
        </div>
        <template v-if="client">
          <div class="flex items-center justify-between gap-3 py-2 border-b border-default">
            <dt class="text-muted">Nächster Termin</dt>
            <dd class="text-toned text-right">{{ nextSessionLabel }}</dd>
          </div>
          <div class="flex items-center justify-between gap-3 py-2">
            <dt class="text-muted">Klient seit</dt>
            <dd class="text-toned text-right">{{ formatShortDate(client.createdAt) }}</dd>
          </div>
        </template>
      </dl>

      <p v-if="!client" class="text-xs text-muted leading-relaxed">
        Dieser Termin ist keinem Klienten zugeordnet – deshalb gibt es hier keine Historie.
      </p>

      <div v-if="client?.note">
        <div class="flex items-center gap-2 mb-2">
          <h3 class="text-sm font-medium text-highlighted">Notiz zum Klienten</h3>
          <UBadge label="Nur für dich" color="neutral" variant="subtle" size="sm" />
        </div>
        <p class="text-xs text-toned leading-relaxed whitespace-pre-line border-l-2 border-primary/40 pl-3">
          {{ client.note }}
        </p>
      </div>

      <div v-if="context.bookingNote">
        <h3 class="text-sm font-medium text-highlighted mb-2">Beim Buchen notiert</h3>
        <p class="text-xs text-toned leading-relaxed whitespace-pre-line border-l-2 border-default pl-3">
          {{ context.bookingNote }}
        </p>
      </div>

      <div v-if="client">
        <h3 class="text-sm font-medium text-highlighted mb-2">Frühere Sitzungen</h3>

        <p v-if="!context.previousSessions.length" class="text-xs text-muted">
          Das ist die erste Sitzung.
        </p>

        <div v-else class="flex flex-col gap-2">
          <div
            v-for="session in context.previousSessions"
            :key="session.bookingId"
            class="rounded-lg border border-default bg-white dark:bg-neutral-900 px-3 py-2.5"
          >
            <p class="text-xs text-dimmed mb-1">
              {{ formatShortDate(session.start) }} · {{ session.durationMinutes }} Min · {{ session.offerName }}
            </p>
            <button
              v-if="session.note"
              type="button"
              class="w-full text-left text-xs text-muted leading-relaxed whitespace-pre-line cursor-pointer rounded outline-primary/25 focus-visible:outline-3"
              :class="!expanded.has(session.bookingId) && 'line-clamp-4'"
              :aria-expanded="expanded.has(session.bookingId)"
              @click="toggle(session.bookingId)"
            >
              {{ session.note }}
            </button>
            <p v-else class="text-xs text-dimmed italic">Keine Notiz</p>
          </div>
        </div>

        <ULink
          :to="`/clients/${client.id}`"
          target="_blank"
          class="inline-flex items-center gap-1 mt-3 text-xs text-primary"
        >
          Klientenprofil öffnen
          <UIcon name="i-lucide-external-link" class="size-3" />
        </ULink>
      </div>

      <p class="text-xs text-dimmed leading-relaxed rounded-lg border border-dashed border-default px-3 py-2.5">
        Hier stehen nur deine eigenen Notizen aus früheren Terminen. Den Verlauf dieser Sitzung
        findest du im Chat.
      </p>
    </template>
  </div>
</template>
