import type { CallChatMessagesResponse } from '@hxroom/shared'
import type { CallChatMessage } from '@hxroom/ui'

/**
 * Der gespeicherte Chat einer Sitzung zum Nachlesen – für das Termin-Detail
 * (doc/videocall-umsetzungsplan.md B7). Gegenstück zu useCallChat, aber ohne Senden und ohne
 * Nachholen über den Ereigniskanal: Hier wird zurückgeschaut, nicht mitgeschrieben.
 *
 * Geladen wird erst, wenn eine Buchung gesetzt ist – wie bei useSessionNotes also erst beim
 * Öffnen des Slideovers, nicht für jede Zeile der Liste.
 */
export function useSessionChat(bookingId: MaybeRefOrGetter<string | null | undefined>) {
  const { $api } = useApi()
  const { public: { apiUrl } } = useRuntimeConfig()

  const messages = ref<CallChatMessage[]>([])
  const loading = ref(false)
  const loadError = ref(false)

  let activeId: string | null = null

  async function load() {
    const id = activeId
    if (!id) return

    loading.value = true
    loadError.value = false
    try {
      const res = await $api<CallChatMessagesResponse>(`/bookings/${id}/call/messages`)
      // Inzwischen ein anderer Termin geöffnet: Der Verlauf gehört nicht mehr hierher.
      if (activeId !== id) return
      messages.value = res.messages.map(row => toChatMessage(row, { self: 'coach', bookingId: id, apiUrl }))
    } catch {
      if (activeId === id) loadError.value = true
    } finally {
      if (activeId === id) loading.value = false
    }
  }

  watch(() => toValue(bookingId) ?? null, (id) => {
    activeId = id
    messages.value = []
    loadError.value = false
    if (id) void load()
  }, { immediate: true })

  const fileCount = computed(() => messages.value.filter(message => message.file).length)

  return { messages, fileCount, loading, loadError, reload: load }
}
