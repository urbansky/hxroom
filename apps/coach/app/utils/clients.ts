import type { ClientListItem } from '@hxroom/shared'

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
