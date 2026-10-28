import type { ClientListItem, CoachBookingResponse } from '@hxroom/shared'

/**
 * Initialen für den Avatar in Liste und Profil.
 *
 * Die Funktion liegt seit dem Umzug der Call-Oberfläche in @hxroom/shared, weil die
 * geteilten Komponenten sie brauchen. Der Re-Export hält den vertrauten Namen in den
 * Auto-Imports dieser App, damit die bestehenden Aufrufer unberührt bleiben.
 */
export { initials as clientInitials } from '@hxroom/shared'

export function formatSessionCount(count: number): string {
  if (count === 0) return 'Noch keine Sitzung'
  return count === 1 ? '1 Sitzung' : `${count} Sitzungen`
}

/** Filtert clientseitig über Name und E-Mail – bei MVP-Datenmengen ausreichend. */
export function filterClients<T extends Pick<ClientListItem, 'name' | 'email'>>(clients: T[], query: string): T[] {
  const term = query.trim().toLowerCase()
  if (!term) return clients
  return clients.filter(c => c.name.toLowerCase().includes(term) || c.email.toLowerCase().includes(term))
}

/** Kennzahlen im Kopf der Klientenseite – aus der Terminliste, die das Profil ohnehin lädt. */
export interface ClientStats {
  heldCount: number
  lastHeldAt: string | null
  noShowCount: number
}

/**
 * Gehalten zählt wie in der API (HELD_SESSION_STATUSES): bestätigt oder abgeschlossen und
 * bereits begonnen. Den nächsten Termin zeigt die rechte Spalte, nicht die Kennzahlen.
 */
export function clientStats(bookings: Pick<CoachBookingResponse, 'start' | 'status'>[], now = new Date()): ClientStats {
  const t = now.getTime()
  const held = bookings.filter(b => (b.status === 'confirmed' || b.status === 'completed') && new Date(b.start).getTime() < t)
  const lastHeldAt = held.reduce<string | null>(
    (latest, b) => (latest === null || new Date(b.start).getTime() > new Date(latest).getTime() ? b.start : latest),
    null,
  )
  return {
    heldCount: held.length,
    lastHeldAt,
    noShowCount: bookings.filter(b => b.status === 'no_show').length,
  }
}

/** „seit 2 Monaten“ – Zusatzzeile der Karte „Klient seit“ auf der Klientenseite. */
export function formatClientSince(iso: string, now = new Date()): string {
  const days = Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000)
  if (days < 1) return 'seit heute'
  if (days < 31) return days === 1 ? 'seit gestern' : `seit ${days} Tagen`
  const months = Math.floor(days / 30.44)
  if (months < 12) return months === 1 ? 'seit einem Monat' : `seit ${months} Monaten`
  const years = Math.floor(months / 12)
  return years === 1 ? 'seit einem Jahr' : `seit ${years} Jahren`
}
