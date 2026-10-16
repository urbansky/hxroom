/**
 * Buchungslink in die Zwischenablage kopieren – geteilt vom Schnellzugriff und der
 * Erfolgsmeldung nach abgeschlossener Einrichtung, damit beide dieselbe Rückmeldung
 * geben.
 */
export const useBookingLink = () => {
  const toast = useToast()
  const { $api } = useApi()
  // Gemeinsamer Zustand, damit die Checkliste sofort umspringt – egal über welchen Knopf
  // (Schnellzugriff, Checkliste, Erfolgsmeldung) kopiert wurde.
  const linkCopied = useState('booking-link-copied', () => false)

  /**
   * Gibt zurück, ob kopiert wurde. Das erste Kopieren hakt „Buchungslink teilen“ in der
   * Onboarding-Checkliste ab (POST /booking-page/link-shared) – nebenbei: Scheitert der
   * Vermerk, ist der Link trotzdem kopiert.
   */
  async function copyBookingLink(url: string | null): Promise<boolean> {
    if (!url) return false
    try {
      // navigator.clipboard gibt es nur in sicheren Kontexten (https oder localhost) –
      // im Fehlerfall bleibt der Link über "Buchungsseite öffnen" erreichbar.
      await navigator.clipboard.writeText(url)
      toast.add({ title: 'Buchungslink kopiert', description: url, color: 'success', icon: 'i-lucide-check' })
      $api('/booking-page/link-shared', { method: 'POST' }).catch(() => {})
      linkCopied.value = true
      return true
    } catch {
      toast.add({ title: 'Kopieren nicht möglich', description: url, color: 'error', icon: 'i-lucide-clipboard-x' })
      return false
    }
  }

  return { copyBookingLink, linkCopied }
}
