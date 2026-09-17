import type { SessionNoteResponse } from '@hxroom/shared'

/** Pause nach dem letzten Tastendruck, bevor gespeichert wird. */
const SAVE_DELAY_MS = 1000
/** Nach einem Fehler von selbst erneut versuchen – im Call ist das meist ein kurzer Netzaussetzer. */
const RETRY_DELAY_MS = 5000

type SaveStatus = 'saving' | 'saved' | 'error' | null

// Ein Dokument ohne einen einzigen Buchstaben gilt als keine Notiz. UEditor liefert für ein
// leeres Feld `{ type: 'doc', content: [{ type: 'paragraph' }] }` – ohne diese Gleichsetzung
// legte schon das Anklicken des Feldes eine leere Zeile in der Datenbank an.
function hasText(node: any): boolean {
  if (node?.type === 'text' && node.text) return true
  return Array.isArray(node?.content) && node.content.some(hasText)
}

function serialize(doc: any): string {
  return hasText(doc) ? JSON.stringify(doc) : 'null'
}

/**
 * Sitzungsnotizen einer Buchung mit automatischem Speichern – für den Call und das
 * Termin-Detail.
 *
 * Der Zustand gehört dem Aufrufer, nicht dem Editor: Im Call baut der Tab-Wechsel der
 * Seitenleiste das Notizfeld ab, und der Text darf dabei nicht verloren gehen.
 *
 * Solange geladen wird oder das Laden gescheitert ist, darf kein Editor stehen – ein leeres
 * Feld würde sonst beim ersten Tastendruck die gespeicherte Notiz überschreiben. UEditor
 * übernimmt seinen Inhalt außerdem nur beim Mounten verlässlich (ein späteres `null` ignoriert
 * er); wer die Buchung wechselt, mountet ihn deshalb neu.
 */
export function useSessionNotes(bookingId: MaybeRefOrGetter<string | null | undefined>) {
  const { $api } = useApi()
  const toast = useToast()

  // Tiptap-Dokument, locker typisiert wie in RichTextEditor.vue.
  const content = ref<any>(null)
  const loading = ref(false)
  const loadError = ref(false)
  /** Die Notiz dieser Buchung liegt vor – erst dann darf ein Editor stehen. */
  const ready = ref(false)
  const status = ref<SaveStatus>(null)

  let activeId: string | null = null
  /** Der Stand, den der Server hat – Maßstab für „ungespeichert“. */
  let savedJson = 'null'
  let saveTimer: ReturnType<typeof setTimeout> | undefined
  let running: Promise<boolean> | null = null
  /** Nach dem Abbau kein Wiederholen mehr – der letzte Versuch läuft beim Abbau selbst. */
  let disposed = false

  function isDirty(): boolean {
    return !!activeId && !loading.value && !loadError.value && serialize(content.value) !== savedJson
  }

  function schedule(delay: number) {
    clearTimeout(saveTimer)
    if (disposed) return
    saveTimer = setTimeout(() => void flush(), delay)
  }

  /**
   * Speichert sofort, falls etwas offen ist, und meldet, ob danach alles beim Server liegt.
   * Nie zwei Anfragen gleichzeitig: Eine spätere könnte sonst vor der früheren ankommen und
   * vom älteren Stand überschrieben werden.
   */
  async function flush(): Promise<boolean> {
    clearTimeout(saveTimer)
    while (running) await running
    if (!isDirty()) return true

    const id = activeId!
    const json = serialize(content.value)
    status.value = 'saving'

    running = $api<SessionNoteResponse>(`/bookings/${id}/notes`, {
      method: 'PUT',
      body: { content: JSON.parse(json) },
    }).then(() => true, () => false)

    const ok = await running
    running = null
    if (activeId !== id) return ok

    if (ok) {
      savedJson = json
      // Während der Anfrage weitergeschrieben: gleich den nächsten Stand hinterher.
      if (isDirty()) schedule(SAVE_DELAY_MS)
      else status.value = 'saved'
    } else {
      status.value = 'error'
      schedule(RETRY_DELAY_MS)
    }
    return ok
  }

  async function load() {
    const id = activeId
    if (!id) return

    loading.value = true
    loadError.value = false
    try {
      const note = await $api<SessionNoteResponse>(`/bookings/${id}/notes`)
      if (activeId !== id) return
      content.value = note.content
      savedJson = serialize(note.content)
      ready.value = true
    } catch {
      if (activeId === id) loadError.value = true
    } finally {
      if (activeId === id) loading.value = false
    }
  }

  watch(() => toValue(bookingId) ?? null, async (id, previousId) => {
    // Sofort, noch vor dem Speichern des alten Stands: Sonst stünde der Text der vorigen
    // Buchung für einen Augenblick im Editor der neuen.
    ready.value = false
    if (previousId && !(await flush())) {
      // Beim Schließen des Termins oder beim Wechsel steht kein Editor mehr, in dem der Text
      // noch läge – das muss der Coach erfahren.
      toast.add({
        title: 'Notizen nicht gespeichert',
        description: 'Die letzten Änderungen konnten nicht gespeichert werden.',
        icon: 'i-lucide-alert-circle',
        color: 'error',
      })
    }

    clearTimeout(saveTimer)
    activeId = id
    content.value = null
    savedJson = 'null'
    status.value = null
    loadError.value = false
    if (id) await load()
  }, { immediate: true })

  watch(content, () => {
    if (isDirty()) schedule(SAVE_DELAY_MS)
  })

  // Die Nachfrage des Browsers beim Schließen oder Neuladen, solange noch etwas unterwegs ist.
  function onBeforeUnload(event: BeforeUnloadEvent) {
    if (isDirty() || running) event.preventDefault()
  }
  onMounted(() => window.addEventListener('beforeunload', onBeforeUnload))
  onBeforeUnmount(() => {
    window.removeEventListener('beforeunload', onBeforeUnload)
    disposed = true
    void flush()
  })

  return { content, ready, loadError, status, flush, reload: load }
}
