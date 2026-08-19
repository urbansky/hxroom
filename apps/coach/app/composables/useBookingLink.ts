/**
 * Buchungslink in die Zwischenablage kopieren – geteilt vom Schnellzugriff und der
 * Erfolgsmeldung nach abgeschlossener Einrichtung, damit beide dieselbe Rückmeldung
 * geben.
 */
export const useBookingLink = () => {
  const toast = useToast()

  async function copyBookingLink(url: string | null) {
    if (!url) return
    try {
      // navigator.clipboard gibt es nur in sicheren Kontexten (https oder localhost) –
      // im Fehlerfall bleibt der Link über "Buchungsseite öffnen" erreichbar.
      await navigator.clipboard.writeText(url)
      toast.add({ title: 'Buchungslink kopiert', description: url, color: 'success', icon: 'i-lucide-check' })
    } catch {
      toast.add({ title: 'Kopieren nicht möglich', description: url, color: 'error', icon: 'i-lucide-clipboard-x' })
    }
  }

  return { copyBookingLink }
}
