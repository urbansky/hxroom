import type { AvailabilitySlotResponse, ClientListItem, CoachBookingResponse, OfferResponse } from '@hxroom/shared'

/**
 * Kennzahlen und Auswahllisten des Dashboards. Bewusst reine Funktionen ohne
 * Vue-Bezug: die Seite lädt, diese Datei rechnet, die Komponenten zeigen an.
 *
 * Alle Werte entstehen clientseitig aus den vorhandenen Listen-Endpunkten – die
 * serverseitigen Aggregate (doc/zeitplan.md, "Dashboard-Queries mit Drizzle")
 * gibt es noch nicht. Deshalb wird hier nur gezählt, was die geladenen Daten
 * vollständig hergeben.
 */

/** Mitternacht nach dem `days`-ten Folgetag – obere Grenze für "heute und die nächsten n Tage". */
function endOfDayAfter(now: Date, days: number): Date {
  const end = startOfDay(now)
  // Über setDate statt über Millisekunden: bei einer Zeitumstellung im Zeitraum
  // hat ein Tag 23 oder 25 Stunden, eine feste Tageslänge verschöbe die Grenze.
  end.setDate(end.getDate() + days + 1)
  return end
}

/**
 * Zeitraum, den das Dashboard von `/bookings` anfordert: vom Montag der laufenden
 * Woche (für die Wochen-Kennzahl) bis zum Ende des Agenda-Fensters. Ein Request
 * für beides – die Wochenkennzahl braucht auch die bereits vergangenen Tage.
 */
export function dashboardBookingsQuery(now = new Date(), days = 7): Record<string, string> {
  return {
    from: startOfWeek(now).toISOString(),
    to: endOfDayAfter(now, days).toISOString(),
  }
}

/**
 * Termine für den Agenda-Auszug: heute und die nächsten `days` Tage, ohne abgesagte.
 *
 * Die Grenze ist das Ende des Termins, nicht der Beginn: eine gerade laufende
 * Sitzung ist auf einer Tagesübersicht die relevanteste Zeile überhaupt und soll
 * nicht in dem Moment verschwinden, in dem sie startet.
 */
export function upcomingBookings(bookings: CoachBookingResponse[], now = new Date(), days = 7): CoachBookingResponse[] {
  const from = now.getTime()
  const until = endOfDayAfter(now, days).getTime()

  return bookings
    .filter(b => b.status !== 'cancelled')
    .filter((b) => {
      const start = new Date(b.start).getTime()
      return start < until && new Date(b.end).getTime() >= from
    })
    .sort((a, b) => a.start.localeCompare(b.start))
}

/** Termine der laufenden Kalenderwoche ohne abgesagte – inklusive der bereits vergangenen Tage. */
export function countThisWeek(bookings: CoachBookingResponse[], now = new Date()): number {
  const from = startOfWeek(now).getTime()
  const until = new Date(from)
  until.setDate(until.getDate() + 7)

  return bookings.filter((b) => {
    if (b.status === 'cancelled') return false
    const start = new Date(b.start).getTime()
    return start >= from && start < until.getTime()
  }).length
}

export interface OnboardingStep {
  key: string
  label: string
  description: string
  done: boolean
  to: string
}

/**
 * Minimalausschnitt der Buchungsseite, den das Dashboard auswertet.
 *
 * `subdomain` und der Anzeigename stammen aus der Organisation und stehen seit der
 * Registrierung fest – als Fortschrittsmerkmal taugen sie deshalb nicht. Ob die
 * Buchungsseite eingerichtet ist, zeigt sich nur an den Feldern, die der Coach selbst
 * füllt: Profiltext und Foto.
 */
export interface OnboardingBookingPage {
  subdomain: string | null
  tagline: string | null
  bio: string | null
  avatarUpdatedAt: string | null
}

/**
 * Vier Schritte bis zur ersten Buchung (doc/funktionen/backoffice-coach.md, Funktion 1.04).
 * Der Zustand wird bei jedem Laden neu aus den Daten abgeleitet und nirgends gespeichert:
 * ein erledigter Schritt bleibt erledigt, weil die Daten da sind, nicht weil ein Flag
 * gesetzt wurde.
 */
export function onboardingSteps(input: {
  bookingPage: OnboardingBookingPage | null
  offers: OfferResponse[]
  slots: AvailabilitySlotResponse[]
  hasBooking: boolean
}): OnboardingStep[] {
  return [
    {
      key: 'bookingpage',
      label: 'Buchungsseite gestalten',
      description: 'Profiltext oder Foto ergänzen',
      done: !!(input.bookingPage?.tagline || input.bookingPage?.bio || input.bookingPage?.avatarUpdatedAt),
      to: '/settings/bookingpage',
    },
    {
      key: 'offers',
      label: 'Sitzungsangebot anlegen',
      description: 'Mindestens ein buchbares Angebot',
      done: input.offers.some(o => o.isActive),
      to: '/bookings/offers',
    },
    {
      key: 'availability',
      label: 'Verfügbarkeit festlegen',
      description: 'Zeiten, zu denen Klienten buchen können',
      done: input.slots.length > 0,
      to: '/bookings/availability',
    },
    {
      key: 'booking',
      label: 'Erste Buchung erhalten',
      description: 'Teile deinen Buchungslink mit Klienten',
      done: input.hasBooking,
      to: '/bookings',
    },
  ]
}

/**
 * Klienten für den Dashboard-Auszug: erst die mit anstehendem Termin (der nächste
 * zuerst), danach die zuletzt gesehenen. Wer nie einen Termin hatte, steht hinten –
 * auf dem Dashboard zählt, wer als Nächstes dran ist.
 */
export function recentClients(clients: ClientListItem[], limit = 5): ClientListItem[] {
  const withNext = clients
    .filter(c => c.nextSessionAt)
    .sort((a, b) => a.nextSessionAt!.localeCompare(b.nextSessionAt!))

  const rest = clients
    .filter(c => !c.nextSessionAt)
    .sort((a, b) => (b.lastSessionAt ?? '').localeCompare(a.lastSessionAt ?? ''))

  return [...withNext, ...rest].slice(0, limit)
}
