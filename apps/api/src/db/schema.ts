import { pgTable, text, timestamp, boolean, integer, jsonb, unique, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import type { BookingStatus, CancelledBy } from '@hxroom/shared';

// better-auth: core tables
export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull(),
  image: text('image'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
  // better-auth admin plugin. `role` ist die plattformweite Rolle ('user' für Coachs,
  // 'admin' für Betreiber) und hat nichts mit member.role zu tun, das die Rolle
  // innerhalb einer Organisation trägt. NULL wird vom Plugin wie defaultRole behandelt,
  // Bestandsaccounts brauchen deshalb keine Datenmigration.
  role: text('role'),
  banned: boolean('banned').default(false),
  banReason: text('ban_reason'),
  banExpires: timestamp('ban_expires'),
});

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  activeOrganizationId: text('active_organization_id'),
  // better-auth admin plugin: gesetzt, solange ein Betreiber die Sitzung eines Coachs
  // übernommen hat (Support-Zugang). Enthält die User-ID des Betreibers.
  impersonatedBy: text('impersonated_by'),
});

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at'),
  updatedAt: timestamp('updated_at'),
});

// better-auth: organization plugin tables
export const organization = pgTable('organization', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').unique(),
  logo: text('logo'),
  createdAt: timestamp('created_at').notNull(),
  metadata: text('metadata'),
  // Läuft eine Kontolöschung, steht hier der Zeitpunkt, ab dem der Cron sie ausführt
  // (30 Tage nach dem Antrag, siehe doc/legal.md); NULL = keine Löschung beantragt.
  //
  // Bewusst an der Organisation und nicht am User: die Sperre der öffentlichen
  // Buchungsseite hängt an OrganizationService.findBySlug und käme sonst nur über zwei
  // Rückwärts-Joins via `member` an das Flag – genau die Richtung, die
  // doc/technisches-konzept.md §17 als Fehlerquelle beschreibt. Außerdem wäre bei
  // mehreren Owner-Membern (Studio-Plan) nicht definiert, wessen Flag gilt.
  //
  // Gespeichert wird das Fälligkeitsdatum, nicht der Antragszeitpunkt: Cron-Filter,
  // Mailtext und Banner lesen damit denselben Wert, statt die Frist je einzeln zu rechnen.
  deletionScheduledFor: timestamp('deletion_scheduled_for'),
});

export const member = pgTable('member', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  role: text('role').notNull(),
  createdAt: timestamp('created_at').notNull(),
});

export const invitation = pgTable('invitation', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  role: text('role'),
  status: text('status').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  inviterId: text('inviter_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
});

export const bookingPage = pgTable('booking_page', {
  id:              text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId:  text('organization_id').notNull().unique().references(() => organization.id, { onDelete: 'cascade' }),
  tagline:         text('tagline'),
  bio:             text('bio'),
  ctaButton:       text('cta_button'),
  ctaIntro:        text('cta_intro'),
  // Separat von `updatedAt`, da Text-Autosave sonst unnötig den Avatar-Cache invalidiert.
  // NULL = kein Avatar gesetzt (Existenz-Flag), sonst Cache-Busting-Version für die Avatar-URL.
  avatarUpdatedAt: timestamp('avatar_updated_at'),
  // Zeitpunkt, an dem der Coach die Erfolgsmeldung nach abgeschlossener Einrichtung
  // weggeklickt hat; NULL = noch nicht gesehen. An der Organisation und nicht am User,
  // weil alle Schritte der Checkliste (Buchungsseite, Angebote, Verfügbarkeiten, erste
  // Buchung) der Organisation gehören – nicht der einzelnen Person.
  onboardingCelebratedAt: timestamp('onboarding_celebrated_at'),
  createdAt:       timestamp('created_at').notNull().defaultNow(),
  updatedAt:       timestamp('updated_at').notNull().$onUpdateFn(() => new Date()),
});

// Sitzungsangebote (Einzelsitzungen). Details: doc/funktionen/angebote-verfuegbarkeiten.md
// Pakete/Mehrfachsitzungen sowie die Verknüpfung mit Verfügbarkeitsslots (Zwei-Stufen-Modell)
// sind dort als spätere Ausbaustufe beschrieben und bewusst noch nicht Teil dieser Tabelle.
export const offers = pgTable('offers', {
  id:              text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId:  text('organization_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  name:            text('name').notNull(),
  durationMinutes: integer('duration_minutes').notNull(),
  priceCents:      integer('price_cents'),          // optional, in Cent; null = kein Preis hinterlegt
  description:     jsonb('description'),            // Tiptap/ProseMirror-Dokument (JSON), null = keine Beschreibung
  isActive:        boolean('is_active').notNull().default(true),
  sortOrder:       integer('sort_order').notNull().default(0),
  createdAt:       timestamp('created_at').notNull().defaultNow(),
  updatedAt:       timestamp('updated_at').notNull().$onUpdateFn(() => new Date()),
});

// Klienten-Matching über mehrere Buchungen hinweg (siehe doc/idee-klienten-matching.md).
// Ein Datensatz pro (Organisation, E-Mail). `email` wird vom Service normalisiert
// (lowercase, getrimmt) vor jedem Insert/Lookup, der Unique-Constraint allein ist
// case-sensitive und reicht dafür nicht aus.
//
// Zwei Entstehungswege:
// - Automatisch beim Bestätigen einer Buchung (BookingsService.confirm) – bewusst erst
//   dann und nicht schon bei der Erstellung, das vermeidet "Geister-Klienten" durch nie
//   bestätigte Buchungen.
// - Manuell durch den Coach (ClientsService.create, Funktion 03 in
//   doc/funktionen/backoffice-coach.md) – für Bestandsklienten aus anderen Systemen.
//   Solche Datensätze haben zunächst keine Buchung; die "keine Geister-Klienten"-Regel
//   gilt nur für den automatischen Weg.
//
// phone/note pflegt ausschließlich der Coach. Sie sind unabhängig von den gleichnamigen
// Snapshot-Feldern an `bookings`, die festhalten, was der Klient beim Buchen eingegeben hat.
export const clients = pgTable('clients', {
  id:             text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text('organization_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  name:           text('name').notNull(),
  email:          text('email').notNull(),
  phone:          text('phone'),
  note:           text('note'), // interne Anmerkung des Coachs, nie für den Klienten sichtbar
  createdAt:      timestamp('created_at').notNull().defaultNow(),
  updatedAt:      timestamp('updated_at').notNull().defaultNow().$onUpdateFn(() => new Date()),
}, (table) => ({
  uniqueEmailPerOrg: unique().on(table.organizationId, table.email),
}));

// Buchungen durchlaufen einen Bestätigungsschritt per E-Mail-Link (siehe
// doc/idee-klienten-matching.md): Status startet als 'pending', wird erst durch
// Bestätigung mit korrektem clientAccessToken zu 'confirmed' – dabei wird auch
// erst der Klient gematcht/angelegt (clientId gesetzt). offerName/durationMinutes
// sind Snapshots zum Buchungszeitpunkt, unabhängig von späteren Angebotsänderungen.
export const bookings = pgTable('bookings', {
  id:                 text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId:     text('organization_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  clientId:           text('client_id').references(() => clients.id, { onDelete: 'set null' }),
  offerId:            text('offer_id').references(() => offers.id, { onDelete: 'set null' }),
  offerName:          text('offer_name').notNull(),
  durationMinutes:    integer('duration_minutes').notNull(),
  startTime:          timestamp('start_time').notNull(),
  endTime:            timestamp('end_time').notNull(),
  status:             text('status').$type<BookingStatus>().notNull().default('pending'),
  clientName:         text('client_name').notNull(),
  clientEmail:        text('client_email').notNull(),
  clientPhone:        text('client_phone'),
  clientNote:         text('client_note'),
  clientAccessToken:  text('client_access_token').notNull(),
  clientTokenUsedAt:  timestamp('client_token_used_at'),
  confirmedAt:        timestamp('confirmed_at'),
  // Videocall (doc/videocall-umsetzungsplan.md A1). Der Warteraum ist kein eigener
  // LiveKit-Raum, sondern ein Zustand dieser Buchung – und er muss die Datenbank
  // erreichen: läge "eingelassen" nur im Speicher, würde ein Reload des Coach-Browsers
  // den bereits eingelassenen Klienten zurück in den Warteraum werfen.
  // clientTokenUsedAt (oben) hält den ersten Warteraum-Eintritt fest.
  admittedAt:         timestamp('admitted_at'),
  callEndedAt:        timestamp('call_ended_at'),
  // Absagedetails. Ohne sie wäre 'cancelled' ein Sammelstatus, in dem eine Absage des
  // Coachs, eine Absage des Klienten und der TTL-Verfall nicht mehr auseinanderzuhalten
  // sind – der Coach sieht so im Kalender, was tatsächlich passiert ist.
  cancelledAt:        timestamp('cancelled_at'),
  cancelledBy:        text('cancelled_by').$type<CancelledBy>(),
  cancellationReason: text('cancellation_reason'),
  createdAt:          timestamp('created_at').notNull().defaultNow(),
  updatedAt:          timestamp('updated_at').notNull().$onUpdateFn(() => new Date()),
}, (table) => ({
  uniqueAccessToken: unique().on(table.clientAccessToken),
  // Partieller Index: eine stornierte/verfallene Buchung blockiert den Zeitpunkt
  // nicht dauerhaft für neue Buchungen.
  noDoubleBookingAtSameStart: uniqueIndex('bookings_org_start_active_unique')
    .on(table.organizationId, table.startTime)
    .where(sql`status != 'cancelled'`),
}));

// Allgemeine Verfügbarkeit (Stufe 1 des Zwei-Stufen-Modells, siehe
// doc/funktionen/angebote-verfuegbarkeiten.md). Die Verknüpfung einzelner Slots mit
// bestimmten Angeboten (Stufe 2, offer_availability_slots) ist bewusst noch nicht
// Teil dieser Tabelle.
export const availabilitySlots = pgTable('availability_slots', {
  id:             text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text('organization_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  weekday:        integer('weekday').notNull(), // 0 = Montag … 6 = Sonntag
  startTime:      text('start_time').notNull(), // "09:00"
  endTime:        text('end_time').notNull(),   // "17:00"
  createdAt:      timestamp('created_at').notNull().defaultNow(),
  updatedAt:      timestamp('updated_at').notNull().$onUpdateFn(() => new Date()),
});

// Coach-weite Einstellungen zur Slot-Berechnung (Stufe 1 des Zwei-Stufen-Modells,
// siehe doc/funktionen/angebote-verfuegbarkeiten.md, Abschnitt 7: bewusst global pro
// Coach, nicht pro Angebot). Wird aktuell nur gespeichert/editiert – die eigentliche
// Slot-Berechnung, die diese Werte konsumiert, folgt in einem späteren Schritt.
export const availabilitySettings = pgTable('availability_settings', {
  id:                 text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId:     text('organization_id').notNull().unique().references(() => organization.id, { onDelete: 'cascade' }),
  bufferMinutes:      integer('buffer_minutes').notNull().default(0),
  minLeadTimeHours:   integer('min_lead_time_hours').notNull().default(0),
  bookingWindowWeeks: integer('booking_window_weeks').notNull().default(2),
  createdAt:          timestamp('created_at').notNull().defaultNow(),
  updatedAt:          timestamp('updated_at').notNull().$onUpdateFn(() => new Date()),
});

// Löschprotokoll für Coach-Konten (doc/technisches-konzept.md §7, Funktion 1.06: die
// DSGVO-Löschung braucht einen Nachweis, dass und was gelöscht wurde).
//
// Der Name ist bewusst nicht `account_deletions`: `account` ist in diesem Schema die
// better-auth-Tabelle der Login-Provider, gemeint ist hier aber der Coach.
//
// `userId` und `organizationId` haben absichtlich KEIN references(): mit einem
// Cascade-Fremdschlüssel würde das Protokoll genau in dem Moment mitgelöscht, in dem es
// die Löschung belegen soll. Aus demselben Grund stehen hier nur IDs – keine Namen, keine
// E-Mail-Adressen. Das Protokoll ist damit selbst frei von personenbezogenen Daten und
// darf dauerhaft bleiben.
export const coachDeletions = pgTable('coach_deletions', {
  id:             text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId:         text('user_id').notNull(),
  organizationId: text('organization_id').notNull(),
  requestedAt:    timestamp('requested_at').notNull().defaultNow(),
  // 'coach' = Selbstlöschung über die Account-Seite, 'operator' = Löschung durch den
  // Betreiber. Der Betreiber-Weg existiert noch nicht, der Wert ist für ihn vorgesehen.
  requestedBy:    text('requested_by').notNull(),
  scheduledFor:   timestamp('scheduled_for').notNull(),
  // Gesetzt, sobald die Erinnerungsmail raus ist – sonst würde der Reminder-Cron sie in
  // den letzten Tagen vor der Ausführung täglich erneut schicken.
  reminderSentAt: timestamp('reminder_sent_at'),
  revokedAt:      timestamp('revoked_at'),
  executedAt:     timestamp('executed_at'),
  // Was tatsächlich gelöscht wurde, als Anzahl je Tabelle: { clients, bookings, offers }.
  deletedCounts:  jsonb('deleted_counts').$type<DeletedCounts>(),
});

export interface DeletedCounts {
  clients:  number;
  bookings: number;
  offers:   number;
}
