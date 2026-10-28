<script setup lang="ts">
import type { CoachBookingResponse, SessionNoteResponse } from '@hxroom/shared'

// Abschlusskarte nach „Sitzung beenden“ (phase5-umsetzungsplan.md, Schritt 8b; Vorbild
// doc/poc/videocall-v2.html, Bildschirm 4). Die Angaben kommen aus dem, was gespeichert ist –
// Termin, Notiz, Chat –, nicht aus dem Zustand der Call-Seite: Die Karte zeigt nur, was
// tatsächlich beim Server liegt. Die Notizen sind beim Beenden schon gespeichert worden
// (confirmEnd in components/CallScreen.vue).
const { bookingId } = defineProps<{ bookingId: string }>()

const { $api } = useApi()

const booking = ref<CoachBookingResponse | null>(null)
const hasNotes = ref<boolean | null>(null)
const loadError = ref(false)

async function load() {
  loadError.value = false
  try {
    const [loaded, note] = await Promise.all([
      $api<CoachBookingResponse>(`/bookings/${bookingId}`),
      $api<SessionNoteResponse>(`/bookings/${bookingId}/notes`),
    ])
    booking.value = loaded
    hasNotes.value = richTextHasText(note.content)
  } catch {
    loadError.value = true
  }
}
// Ohne await: Die Karte erscheint erst nach dem Beenden, mitten auf der Seite – eine
// asynchrone Komponente risse dort die Suspense-Grenze der Seite erneut auf.
void load()

const chat = useSessionChat(() => bookingId)
const { messages: chatMessages, fileCount: chatFileCount } = chat

const duration = computed(() => (booking.value ? formatCallDuration(booking.value) : null))
</script>

<template>
  <div class="w-full max-w-md flex flex-col items-center text-center gap-6">
    <div class="size-14 rounded-full bg-success/10 flex items-center justify-center">
      <UIcon name="i-lucide-check" class="size-7 text-success" />
    </div>
    <div>
      <h1 class="font-serif text-3xl text-highlighted mb-1.5">Sitzung abgeschlossen</h1>
      <p class="text-sm text-muted">Als gehalten vermerkt.</p>
    </div>

    <dl v-if="booking" class="w-full rounded-xl border border-default bg-white dark:bg-neutral-900 p-4 text-left text-sm flex flex-col gap-2.5">
      <div class="flex justify-between gap-4">
        <dt class="text-muted">Klient</dt>
        <dd class="text-highlighted font-medium text-right truncate">{{ booking.clientName }}</dd>
      </div>
      <div class="flex justify-between gap-4">
        <dt class="text-muted">Datum</dt>
        <dd class="text-highlighted text-right">{{ formatDayHeading(booking.start) }}, {{ formatTimeRange(booking) }}</dd>
      </div>
      <div v-if="duration" class="flex justify-between gap-4">
        <dt class="text-muted">Dauer</dt>
        <dd class="text-highlighted text-right">{{ duration }}</dd>
      </div>
      <div class="flex justify-between gap-4">
        <dt class="text-muted">Notizen</dt>
        <dd class="text-right flex items-center gap-1.5" :class="hasNotes ? 'text-success' : 'text-muted'">
          <UIcon v-if="hasNotes" name="i-lucide-check" class="size-4" />
          {{ hasNotes ? 'gespeichert' : 'keine Notizen' }}
        </dd>
      </div>
      <div v-if="chatMessages.length" class="flex justify-between gap-4">
        <dt class="text-muted">Chat</dt>
        <dd class="text-highlighted text-right">{{ formatChatSummary(chatMessages.length, chatFileCount) }}</dd>
      </div>
    </dl>
    <p v-else-if="loadError" class="text-sm text-muted">Die Angaben zur Sitzung konnten nicht geladen werden.</p>

    <div class="flex flex-wrap items-center justify-center gap-2">
      <UButton :to="`/bookings/${bookingId}`" label="Zur Sitzung" icon="i-lucide-arrow-right" trailing />
      <UButton to="/bookings" label="Zu den Terminen" color="neutral" variant="subtle" />
    </div>
  </div>
</template>
