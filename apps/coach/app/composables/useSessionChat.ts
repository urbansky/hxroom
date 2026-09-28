import type { CallChatMessageResponse, CallChatMessagesResponse } from '@hxroom/shared'
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
  /** Das Entfernen einer Datei ist gescheitert – für eine Zeile im Slideover. */
  const removeError = ref(false)

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
    removeError.value = false
    if (id) void load()
  }, { immediate: true })

  const fileCount = computed(() => messages.value.filter(message => message.file).length)

  /**
   * Die Datei einer Nachricht entfernen – der Coach darf das auch nach der Sitzung, etwa auf
   * einen Löschwunsch des Klienten hin. Ist sie schon weg (404), nur neu laden.
   */
  async function remove(id: string): Promise<void> {
    const bookingId = activeId
    const fileId = messages.value.find(message => message.id === id)?.file?.id
    if (!bookingId || !fileId) return

    removeError.value = false
    try {
      const saved = await $api<CallChatMessageResponse>(`/bookings/${bookingId}/call/files/${fileId}`, { method: 'DELETE' })
      if (activeId !== bookingId) return
      const index = messages.value.findIndex(message => message.id === id)
      if (index >= 0) messages.value[index] = toChatMessage(saved, { self: 'coach', bookingId, apiUrl })
    } catch (err) {
      if (activeId !== bookingId) return
      if ((err as { statusCode?: number })?.statusCode === 404) void load()
      else removeError.value = true
    }
  }

  return { messages, fileCount, loading, loadError, removeError, reload: load, remove }
}
