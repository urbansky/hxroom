import type { ClientListItem } from '@hxroom/shared'

/**
 * Initialen für den Avatar in Liste und Profil: erster und letzter Namensbestandteil.
 * Fällt auf ein einzelnes Zeichen zurück, wenn nur ein Wort vorhanden ist.
 */
export function clientInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0]![0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1]![0] ?? '' : ''
  return (first + last).toUpperCase()
}

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
