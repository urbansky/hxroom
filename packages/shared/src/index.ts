import { z } from 'zod';

// Booking status
// 'no_show': Der Termin war verbindlich, der Klient ist nicht erschienen (B6). Vom Coach
// vermerkt, nie automatisch – ein bestätigter Termin ohne Einlass kann auch ein Gespräch am
// Telefon gewesen sein. Kein Unterfall von 'cancelled': Abgesagt wurde nichts, und ein
// späteres Ausfallhonorar hinge sonst an der falschen Stelle. Zählt nicht als gehalten.
export const BookingStatus = z.enum(['pending', 'confirmed', 'completed', 'cancelled', 'no_show']);
export type BookingStatus = z.infer<typeof BookingStatus>;

// Wer eine Buchung abgesagt hat. 'system' steht für den automatischen Verfall einer
// nie bestätigten Buchung (BookingExpiryService) – für den Coach ist das etwas anderes
// als eine bewusste Absage, im Status 'cancelled' wäre es sonst nicht unterscheidbar.
export const CancelledBy = z.enum(['coach', 'client', 'system']);
export type CancelledBy = z.infer<typeof CancelledBy>;

// Herkunft einer Buchung. 'booking_page' ist der öffentliche Weg über die Buchungsseite,
// 'ad_hoc' der vom Coach selbst gestartete Spontan-Termin. Als Enum statt als Flag, weil
// der zweite Teil von Funktion 2.04 (Termin zu einem gewählten Zeitpunkt anlegen) hier
// später als 'manual' dazukommt.
export const BookingOrigin = z.enum(['booking_page', 'ad_hoc']);
export type BookingOrigin = z.infer<typeof BookingOrigin>;

// Plan types
export const PlanType = z.enum(['trial', 'solo', 'pro', 'studio']);
export type PlanType = z.infer<typeof PlanType>;

// Transcript status
export const TranscriptStatus = z.enum(['pending', 'processing', 'done', 'error']);
export type TranscriptStatus = z.infer<typeof TranscriptStatus>;

// Constants
export const DEFAULT_SESSION_DURATION = 60;
export const DEFAULT_PRIMARY_COLOR = '#8B9E8A';

// Booking page settings
export const bookingPageSchema = z.object({
  subdomain:   z.string().min(3).max(63).regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/).optional(),
  profileName: z.string().min(1).max(160).optional(),
  tagline:     z.string().max(160).nullish(),
  bio:         z.string().max(2000).nullish(),
  ctaButton:   z.string().max(80).nullish(),
  ctaIntro:    z.string().max(160).nullish(),
});
export type BookingPageDto = z.infer<typeof bookingPageSchema>;

// Rich-Text-Beschreibung (Tiptap/ProseMirror-Dokument als JSON)
//
// Sicherheitsrelevant: Es werden nur die Knoten-/Mark-Typen zugelassen, die der
// UEditor mit eingeschränkter Extension-Konfiguration überhaupt erzeugen kann
// (siehe apps/coach/app/components/RichTextEditor.vue). Das JSON ist reine Struktur
// ohne Markup – nicht erlaubte Knotentypen (z. B. Bilder, Raw-HTML) werden schon
// hier abgelehnt statt erst beim Rendern herausgefiltert zu werden.
const richTextMarkSchema = z.union([
  z.object({ type: z.literal('bold') }),
  z.object({ type: z.literal('italic') }),
  z.object({
    type: z.literal('link'),
    attrs: z.object({
      href:   z.string().url('Ungültige URL').refine((v) => /^https?:\/\//i.test(v), 'Nur http(s)-Links erlaubt'),
      target: z.string().optional(),
      rel:    z.string().optional(),
    }),
  }),
]);

const richTextNodeSchema: z.ZodType<unknown> = z.lazy(() => z.object({
  type:    z.enum(['paragraph', 'text', 'heading', 'bulletList', 'orderedList', 'listItem', 'hardBreak']),
  attrs:   z.object({ level: z.number().int().min(2).max(3).optional() }).optional(),
  marks:   z.array(richTextMarkSchema).optional(),
  text:    z.string().optional(),
  content: z.array(richTextNodeSchema).optional(),
}));

// Die Längengrenze hängt am Einsatz: Eine Angebotsbeschreibung ist ein Absatz, eine
// Mitschrift aus einer Stunde Gespräch ein Vielfaches davon. Gemessen wird das JSON, also
// mitsamt der Struktur – nicht nur der sichtbare Text.
function richTextDoc(maxLength: number, message: string) {
  return z.object({
    type:    z.literal('doc'),
    content: z.array(richTextNodeSchema).optional(),
  }).nullable()
    .refine((doc) => !doc || JSON.stringify(doc).length <= maxLength, message);
}

export const richTextDocSchema = richTextDoc(20_000, 'Beschreibung ist zu lang');
export type RichTextDoc = z.infer<typeof richTextDocSchema>;

// Sitzungsnotizen des Coachs (project.md §5a) – dieselbe Knotenmenge wie die
// Angebotsbeschreibung, weil beide im selben Editor entstehen.
//
// Die Grenze liegt knapp unter dem Body-Limit der API (Express: 100 kB), damit ein zu langes
// Dokument als Validierungsfehler ankommt und nicht als 413. Rund 90 000 Zeichen JSON sind
// mehrere tausend Wörter – mehr, als in einer Sitzung mitgeschrieben wird.
export const sessionNoteSchema = z.object({
  content: richTextDoc(90_000, 'Notizen sind zu lang'),
});
export type SessionNoteDto = z.infer<typeof sessionNoteSchema>;

export interface SessionNoteResponse {
  content:   RichTextDoc;
  updatedAt: string | null; // null = noch nie gespeichert
}

// Sitzungsangebote (Einzelsitzungen)
export const createOfferSchema = z.object({
  name:             z.string().min(1, 'Name ist erforderlich').max(160),
  durationMinutes:  z.number().int().min(5, 'Mindestens 5 Minuten').max(480, 'Maximal 480 Minuten'),
  priceCents:       z.number().int().min(0, 'Preis darf nicht negativ sein').nullish(),
  description:      richTextDocSchema.optional(),
  isActive:         z.boolean().optional(),
});
export type CreateOfferDto = z.infer<typeof createOfferSchema>;

export const updateOfferSchema = createOfferSchema.partial();
export type UpdateOfferDto = z.infer<typeof updateOfferSchema>;

export const reorderOffersSchema = z.object({
  ids: z.array(z.string()).min(1),
});
export type ReorderOffersDto = z.infer<typeof reorderOffersSchema>;

export const offerResponseSchema = z.object({
  id:              z.string(),
  name:            z.string(),
  durationMinutes: z.number(),
  priceCents:      z.number().nullable(),
  description:     richTextDocSchema,
  isActive:        z.boolean(),
  sortOrder:       z.number(),
});
export type OfferResponse = z.infer<typeof offerResponseSchema>;

/**
 * Farbe je Sitzungsart – geteilt zwischen Coach-App (Agenda, Wochenansicht, Angebotsliste)
 * und den Termin-Mails, damit dasselbe Angebot überall dieselbe Farbe trägt.
 *
 * Die Farbe wird deterministisch aus der Angebots-ID abgeleitet und nirgends gespeichert:
 * Kein Schema-Eingriff, und dasselbe Angebot bekommt bei jedem Rendern dieselbe Farbe.
 * Wenn der Coach Farben später selbst wählen soll, tritt eine Spalte an `offers` an die
 * Stelle dieser Ableitung – dann bleibt `offerColor()` nur noch der Fallback für Angebote
 * ohne gesetzte Farbe.
 *
 * Die Palette bleibt im warmen HxRoom-Farbklima (Sage und Gold zuerst) und meidet reines
 * Rot – das ist für Fehlerzustände reserviert. Die Farbtöne sind über den Kreis verteilt,
 * damit benachbarte Angebote in der Liste nicht verwechselt werden; der engste Abstand
 * liegt bei 26° zwischen Terrakotta und Gold.
 *
 * Die Werte sind bewusst hell und gesättigt (L ≈ 50–67). Das ist eine Festlegung auf den
 * Einsatz als Farbfläche ohne Text: Weißer Text darauf käme nur auf ~2,5:1. Wer die Farbe
 * später als gefüllten Block mit Beschriftung nutzen will (etwa in der Wochenansicht),
 * braucht dafür abgedunkelte Varianten.
 *
 * Die Reihenfolge ist Teil des Vertrags: Ein Umsortieren verschiebt still die Farben aller
 * bestehenden Angebote (abgesichert durch einen Test in apps/api/src/mail/templates).
 */
const OFFER_COLORS = [
  '#7FB07C', // Sage
  '#D2A24C', // Gold
  '#5FAEB5', // Petrol
  '#D9785C', // Terrakotta
  '#A886BC', // Pflaume
  '#A3B14F', // Olive
  '#7EA1CC', // Blaugrau
  '#D2839A', // Altrosa
] as const;

// djb2 – klein und ohne Abhängigkeit. Es geht nicht um Streuqualität, sondern darum,
// dass dieselbe ID immer denselben Index trifft.
function hashString(value: string): number {
  let hash = 5381;
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) + hash + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/** Farbe der Sitzungsart als Hex-Wert, abgeleitet aus der Angebots-ID. */
export function offerColor(offerId: string): string {
  return OFFER_COLORS[hashString(offerId) % OFFER_COLORS.length]!;
}

// Namen und Zeiten
//
// Liegt hier und nicht in einer App, weil die geteilte Call-Oberfläche (packages/ui) es
// braucht und beide Frontends sie einbinden. Reine Funktionen ohne Vue-Bezug, wie
// offerColor darüber.

/**
 * Initialen für einen Avatar: erster und letzter Namensbestandteil.
 * Fällt auf ein einzelnes Zeichen zurück, wenn nur ein Wort vorhanden ist.
 */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0]![0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1]![0] ?? '' : '';
  return (first + last).toUpperCase();
}

/**
 * Der Vorname. "Markus stummschalten" liest sich im Gespräch natürlicher als der volle Name.
 */
export function firstName(name: string, fallback = ''): string {
  return name.trim().split(/\s+/)[0] || fallback;
}

/**
 * Laufzeit der Sitzung als Uhrenanzeige – "12:04", ab einer Stunde "1:12:04".
 *
 * Sekundengenau und aufsteigend: Der Timer zählt vom Einlass hoch, nicht von der gebuchten
 * Dauer herunter. Ein Countdown auf null würde beide Seiten unter Druck setzen, obwohl
 * niemand die Sitzung automatisch beendet.
 *
 * `now` nimmt beides: Die Coach-App führt die Jetzt-Zeit als Date, die Klienten-App als
 * Millisekunden. Eine Signatur für beide erspart es, eine der beiden umzustellen.
 */
export function formatDuration(fromIso: string, now: Date | number = Date.now()): string {
  const nowMs = typeof now === 'number' ? now : now.getTime();
  const total = Math.max(0, Math.floor((nowMs - new Date(fromIso).getTime()) / 1000));
  const seconds = String(total % 60).padStart(2, '0');
  const minutes = Math.floor(total / 60) % 60;
  const hours = Math.floor(total / 3600);

  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}`
    : `${minutes}:${seconds}`;
}

// Allgemeine Verfügbarkeit (Stufe 1 des Zwei-Stufen-Modells)
const timeOfDaySchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Uhrzeit muss im Format HH:MM angegeben werden');

export const createAvailabilitySlotSchema = z.object({
  weekday:   z.number().int().min(0, 'Wochentag muss zwischen 0 und 6 liegen').max(6, 'Wochentag muss zwischen 0 und 6 liegen'),
  startTime: timeOfDaySchema,
  endTime:   timeOfDaySchema,
}).refine((slot) => slot.startTime < slot.endTime, {
  message: 'Startzeit muss vor der Endzeit liegen',
  path: ['endTime'],
});
export type CreateAvailabilitySlotDto = z.infer<typeof createAvailabilitySlotSchema>;

export const updateAvailabilitySlotSchema = z.object({
  weekday:   z.number().int().min(0, 'Wochentag muss zwischen 0 und 6 liegen').max(6, 'Wochentag muss zwischen 0 und 6 liegen').optional(),
  startTime: timeOfDaySchema.optional(),
  endTime:   timeOfDaySchema.optional(),
}).refine((slot) => !slot.startTime || !slot.endTime || slot.startTime < slot.endTime, {
  message: 'Startzeit muss vor der Endzeit liegen',
  path: ['endTime'],
});
export type UpdateAvailabilitySlotDto = z.infer<typeof updateAvailabilitySlotSchema>;

export const availabilitySlotResponseSchema = z.object({
  id:        z.string(),
  weekday:   z.number(),
  startTime: z.string(),
  endTime:   z.string(),
});
export type AvailabilitySlotResponse = z.infer<typeof availabilitySlotResponseSchema>;

// Coach-weite Zeitslot-Einstellungen (Pufferzeit, Buchungsvorlaufzeit) – global pro
// Coach, nicht pro Angebot (siehe doc/funktionen/angebote-verfuegbarkeiten.md, Abschnitt 7)
export const availabilitySettingsSchema = z.object({
  bufferMinutes:      z.number().int().min(0, 'Pufferzeit darf nicht negativ sein').max(120, 'Pufferzeit darf maximal 120 Minuten betragen').optional(),
  minLeadTimeHours:   z.number().int().min(0, 'Buchungsvorlaufzeit darf nicht negativ sein').max(168, 'Buchungsvorlaufzeit darf maximal 168 Stunden betragen').optional(),
  bookingWindowWeeks: z.number().int().min(1, 'Buchungsfenster muss mindestens 1 Woche betragen').max(12, 'Buchungsfenster darf maximal 12 Wochen betragen').optional(),
});
export type AvailabilitySettingsDto = z.infer<typeof availabilitySettingsSchema>;

export const availabilitySettingsResponseSchema = z.object({
  bufferMinutes:      z.number(),
  minLeadTimeHours:   z.number(),
  bookingWindowWeeks: z.number(),
});
export type AvailabilitySettingsResponse = z.infer<typeof availabilitySettingsResponseSchema>;

// Konkret buchbares Zeitfenster für ein Angebot (berechnet aus availabilitySlots +
// availabilitySettings), öffentlich auf der Klienten-Buchungsseite angezeigt.
export const availableSlotResponseSchema = z.object({
  start: z.string(), // ISO 8601
  end:   z.string(),
});
export type AvailableSlotResponse = z.infer<typeof availableSlotResponseSchema>;

// Buchungserstellung durch den Klienten. offerId kommt aus dem URL-Pfad, nicht aus
// dem Body. Buchung entsteht als 'pending' – siehe doc/idee-klienten-matching.md.
export const createBookingSchema = z.object({
  start:       z.string().datetime({ message: 'Ungültiger Zeitpunkt' }),
  clientName:  z.string().min(1, 'Name ist erforderlich').max(160),
  clientEmail: z.string().email('Ungültige E-Mail-Adresse'),
  clientPhone: z.string().max(40).optional(),
  clientNote:  z.string().max(2000).optional(),
});
export type CreateBookingDto = z.infer<typeof createBookingSchema>;

// Bestätigung einer Buchung per Token aus dem E-Mail-Link (Mail-Versand selbst
// noch nicht Teil dieser Runde).
export const confirmBookingSchema = z.object({
  token: z.string().min(1, 'Token ist erforderlich'),
});
export type ConfirmBookingDto = z.infer<typeof confirmBookingSchema>;

// Absage durch den Klienten über den Link aus der Bestätigungsmail. Derselbe Token wie
// beim Confirm-Flow – der Klient hat kein Konto, der Link ist sein einziger Zugang.
// Der Grund ist optional und geht in die Benachrichtigung an den Coach.
export const cancelBookingByClientSchema = z.object({
  token:  z.string().min(1, 'Token ist erforderlich'),
  reason: z.string().max(500, 'Grund ist zu lang').optional(),
});
export type CancelBookingByClientDto = z.infer<typeof cancelBookingByClientSchema>;

// Token-authentifizierte Klienten-Sicht auf die eigene Buchung: zeigt vor dem Absagen,
// welcher Termin getroffen wird. Bewusst ohne clientEmail/clientPhone/clientNote – wer
// den Link in die Finger bekommt, soll nichts erfahren, was nicht ohnehin in der Mail steht.
export const clientBookingViewSchema = z.object({
  id:          z.string(),
  start:       z.string(),   // ISO 8601
  end:         z.string(),
  offerName:   z.string(),
  coachName:   z.string(),
  status:      BookingStatus,
  cancellable: z.boolean(),
});
export type ClientBookingView = z.infer<typeof clientBookingViewSchema>;

export const bookingResponseSchema = z.object({
  id:        z.string(),
  start:     z.string(),
  end:       z.string(),
  offerName: z.string(),
  status:    BookingStatus,
});
export type BookingResponse = z.infer<typeof bookingResponseSchema>;

// Coach-Sicht auf eine Buchung (Kalender im Backoffice). Enthält bewusst die
// Klientendaten – für sie ist der Coach der Verantwortliche im Sinne der DSGVO.
// clientAccessToken fehlt hier genauso bewusst: er ist der Schlüssel zum Warteraum.
// Einzige Ausnahme ist adHocBookingResponseSchema – dort begründet und eng begrenzt.
export const coachBookingResponseSchema = z.object({
  id:              z.string(),
  start:           z.string(),   // ISO 8601
  end:             z.string(),
  offerId:         z.string().nullable(),
  offerName:       z.string(),
  durationMinutes: z.number(),
  status:          BookingStatus,
  clientId:        z.string().nullable(),
  clientName:      z.string(),
  clientEmail:     z.string(),
  clientPhone:     z.string().nullable(),
  clientNote:      z.string().nullable(),
  confirmedAt:     z.string().nullable(),
  createdAt:       z.string(),
  origin:          BookingOrigin,
  // Absagedetails: für Altbestand und für alles, was nie abgesagt wurde, null.
  cancelledAt:        z.string().nullable(),
  cancelledBy:        CancelledBy.nullable(),
  cancellationReason: z.string().nullable(),
  // Wann der Coach den Klienten eingelassen hat, null ohne Einlass. Das Termin-Detail
  // braucht es für „Als nicht erschienen vermerken" (B6): Wer eingelassen wurde, war da.
  admittedAt:         z.string().nullable(),
});
export type CoachBookingResponse = z.infer<typeof coachBookingResponseSchema>;

// Query-Parameter kommen als Strings an, daher z.coerce statt z.number.
//
// `status` nimmt mehrere Werte, kommagetrennt (`status=confirmed,completed`) oder wiederholt
// (`status=confirmed&status=completed`): „Vergangene Termine“ sind gehaltene Sitzungen, und
// die tragen je nachdem, ob der Call beendet wurde, 'confirmed' oder 'completed'.
//
// `order` entscheidet mit, welche Termine das Limit abschneidet: Vergangenes wird
// absteigend geladen, sonst fielen bei vielen Terminen ausgerechnet die jüngsten weg.
export const listCoachBookingsQuerySchema = z.object({
  from:   z.string().datetime({ message: 'Ungültiger Zeitpunkt' }).optional(),
  to:     z.string().datetime({ message: 'Ungültiger Zeitpunkt' }).optional(),
  status: z.preprocess(
    (value) => (typeof value === 'string' ? value.split(',') : value),
    z.array(BookingStatus).min(1),
  ).optional(),
  order:  z.enum(['asc', 'desc']).default('asc'),
  limit:  z.coerce.number().int().min(1).max(500).default(200),
});
export type ListCoachBookingsQuery = z.infer<typeof listCoachBookingsQuerySchema>;

// Absage durch den Coach. Der Grund ist optional und geht in die Storno-Mail an den Klienten.
export const cancelBookingSchema = z.object({
  reason: z.string().max(500, 'Grund ist zu lang').optional(),
});
export type CancelBookingDto = z.infer<typeof cancelBookingSchema>;

// Zuordnung einer Buchung zu einem Klienten (Baustein 3 aus doc/idee-klienten-matching.md):
// der Coach korrigiert das automatische E-Mail-Matching oder verknüpft manuell.
// null löst die Zuordnung, ohne die Buchung selbst zu verändern.
export const assignBookingClientSchema = z.object({
  clientId: z.string().min(1, 'Klient ist erforderlich').nullable(),
});
export type AssignBookingClientDto = z.infer<typeof assignBookingClientSchema>;

// Spontan-Termin: Der Coach startet eine Sitzung, die jetzt beginnt (backoffice-coach.md 2.04).
// Der Beginn ist der Zeitpunkt des Aufrufs. Bewusst ohne Zeitangabe: Sobald man einen
// Zeitpunkt wählen kann, ist es kein spontaner Termin mehr, sondern das manuelle Anlegen
// (eigener Schritt).
//
// Das Angebot ist optional: Ein spontanes Gespräch ist oft keines der veröffentlichten
// Angebote, und niemand soll erst ein Pseudo-Angebot anlegen müssen, um telefonieren zu
// können. Ohne Angebot gilt der Spontan-Standard aus booking.constants.ts (Bezeichnung
// und Dauer); mit Angebot kommen beide wie gehabt von dort.
export const createAdHocBookingSchema = z.object({
  clientId: z.string().min(1, 'Klient ist erforderlich'),
  offerId:  z.string().min(1, 'Angebot ist erforderlich').optional(),
});
export type CreateAdHocBookingDto = z.infer<typeof createAdHocBookingSchema>;

// Die einzige Antwort, die den Zugangslink des Klienten mitführt – und damit den
// clientAccessToken, der sonst nirgends die API verlässt. Sie geht an den
// authentifizierten Eigentümer der Buchung, der den Link ohnehin weitergeben soll: Eine
// Mail ist für ein Gespräch in fünf Minuten oft zu langsam, der Coach braucht ihn für
// WhatsApp, SMS oder das laufende Telefonat. Nur hier, nie in GET /bookings.
export const adHocBookingResponseSchema = coachBookingResponseSchema.extend({
  callUrl: z.string(),
});
export type AdHocBookingResponse = z.infer<typeof adHocBookingResponseSchema>;

// Zugangsfenster für den Videocall (doc/videocall-umsetzungsplan.md A1).
//
// Vorher: Wer zehn Minuten zu früh dran ist, soll den Warteraum sehen und nicht eine
// Fehlerseite. Eine Stunde deckt auch den Klienten ab, der den Link schon mittags
// öffnet, um die Technik zu prüfen.
//
// Nachher: gemessen ab dem geplanten *Ende*, nicht ab dem Beginn. doc/technisches-konzept.md §7
// nannte "2 Stunden nach geplantem Sitzungsbeginn" – bei einer 90-Minuten-Sitzung fiele der
// Zugang damit eine halbe Stunde vor Schluss weg.
//
// Liegt hier und nicht in der API, weil beide Seiten dieselbe Grenze brauchen: Der Server
// entscheidet über den Zugang, das Backoffice des Coachs blendet danach den
// "Sitzung starten"-Knopf ein (A5). Eine zweite Konstante im Frontend liefe unweigerlich
// irgendwann auseinander.
export const CALL_OPENS_MINUTES_BEFORE_START = 60;
export const CALL_CLOSES_MINUTES_AFTER_END = 120;

export function callWindowOpensAt(startTime: Date): Date {
  return new Date(startTime.getTime() - CALL_OPENS_MINUTES_BEFORE_START * 60_000);
}

export function callWindowClosesAt(endTime: Date): Date {
  return new Date(endTime.getTime() + CALL_CLOSES_MINUTES_AFTER_END * 60_000);
}

/** Ist der Videocall zu diesem Zeitpunkt zugänglich? Rein zeitlich – den Status der
 *  Buchung prüft der Server zusätzlich (resolveCallState). */
export function isWithinCallWindow(startTime: Date, endTime: Date, now: Date): boolean {
  return now >= callWindowOpensAt(startTime) && now <= callWindowClosesAt(endTime);
}

// Videocall: Zustand einer Sitzung (doc/videocall-umsetzungsplan.md A1).
//
// Der Warteraum ist kein eigener LiveKit-Raum, sondern dieser Zustand. Ein falscher
// oder fehlender Token ist bewusst kein Zustand, sondern ein 401 – und eine fremde
// Buchung ein 404. Hier stehen nur Lagen, die es dem Aufrufer zu erklären gilt.
export const CallState = z.enum([
  'too_early', // Zugangsfenster noch nicht offen – opensAt sagt, ab wann
  'open',      // Fenster offen, der Klient hat den Warteraum noch nicht betreten
  'waiting',   // Klient ist im Warteraum, der Coach hat noch nicht eingelassen
  'admitted',  // Coach hat eingelassen – ab hier trägt die Antwort den LiveKit-Token
  'ended',     // Sitzung wurde beendet
  'missed',    // Der Coach hat vermerkt, dass der Klient nicht erschienen ist (B6)
  'cancelled', // Buchung abgesagt
  'expired',   // Zugangsfenster vorbei oder Buchung nie bestätigt
]);
export type CallState = z.infer<typeof CallState>;

// Bewusst eine Form für beide Rollen: dasselbe Objekt beantwortet die Frage des
// Klienten ("darf ich rein?") und die des Coachs ("wartet jemand?"). Es trägt später
// unverändert das SSE-Ereignis (A2) und den LiveKit-Token (B2).
//
// Keine clientEmail/-Phone/-Note – wie bei clientBookingViewSchema soll aus dem Link
// nichts hervorgehen, was nicht ohnehin in der Mail des Klienten steht.
export const callAccessResponseSchema = z.object({
  bookingId:    z.string(),
  state:        CallState,
  start:        z.string(),   // ISO 8601
  end:          z.string(),
  offerName:    z.string(),
  // Nur für die Farbe des Angebots (offerColor) – dieselbe Kennzeichnung wie in der
  // Agenda des Coachs und in den Termin-Mails. Null bei manuell angelegten Terminen.
  offerId:      z.string().nullable(),
  coachName:    z.string(),
  clientName:   z.string(),
  // Grenzen des Zugangsfensters. Beide gehen mit, weil das Verstreichen von Zeit
  // serverseitig kein Ereignis erzeugt (nichts wird geschrieben) – die Oberfläche rechnet
  // Countdown und Ablauf damit selbst aus, statt im Sekundentakt nachzufragen.
  opensAt:      z.string(),
  closesAt:     z.string(),
  // Erster Eintritt des Klienten in den Warteraum. Für den Coach die Antwort auf
  // "wie lange wartet er schon" – ob überhaupt jemand wartet, sagt bereits state.
  waitingSince: z.string().nullable(),
  admittedAt:   z.string().nullable(),
  // Hält der Klient gerade eine Verbindung zum Ereigniskanal? Für den Coach der
  // Unterschied zwischen "wartet seit 10:02" und "war da, ist jetzt weg". Bewusst neben
  // dem Zustand statt in ihm: waitingSince ist eine Tatsache der Buchung, clientOnline
  // eine Momentaufnahme des Servers.
  clientOnline: z.boolean(),
  // Der Zugang zum LiveKit-Raum. Null, solange es keinen Raum gibt – vor dem Zugangsfenster
  // und nach dem Ende.
  //
  // Adresse und Ausweis sind getrennt, und die Trennung ist der Kern: Die `url` steht ab
  // dem offenen Fenster bereit, damit der Klient die Verbindung schon im Warteraum
  // vorwärmen kann (`prepareCall()` braucht kein Token) – genau dafür wurde der Warteraum
  // vorne gebaut. Der `token` kommt erst, wenn dieser Aufrufer wirklich beitreten darf:
  // beim Klienten ab dem Einlass, beim Coach schon vorher, weil er einlässt.
  //
  // Die URL gehört in die Antwort, weil sie sich zwischen lokal
  // (ws://livekit.hxroom.localhost) und Betrieb (wss://livekit.hxroom.de) unterscheidet –
  // eine zweite Konstante im Frontend liefe auseinander, wie es die Fenstergrenzen vor A5
  // taten. Sie ist keine Berechtigung; das Geheimnis ist allein der Token.
  //
  // Der Token ist kurzlebig (10 Minuten) und wird bei jedem Abruf und jedem SSE-Ereignis
  // neu ausgestellt. Er begrenzt nur das Zeitfenster zum Verbinden, nicht die
  // Gesprächsdauer (technisches-konzept.md §8).
  livekit: z.object({ url: z.string(), token: z.string().nullable() }).nullable(),
});
export type CallAccessResponse = z.infer<typeof callAccessResponseSchema>;

// Seitenleiste „Klient“ im Call des Coachs. Ein eigener Abruf statt weiterer Felder in
// CallAccessResponse: Jene Antwort geht auch an den Klienten, und aus seinem Zugangslink
// soll nicht mehr hervorgehen, als in seiner Mail ohnehin steht.
export const callClientContextSchema = z.object({
  // Null, wenn die Buchung keinem Klienten zugeordnet ist.
  client: z.object({
    id:        z.string(),
    name:      z.string(),
    email:     z.string(),
    phone:     z.string().nullable(),
    note:      z.string().nullable(),
    createdAt: z.string(),
  }).nullable(),
  // Was der Klient beim Buchen dieses Termins eingetragen hat.
  bookingNote:   z.string().nullable(),
  // Gehaltene Sitzungen vor diesem Termin plus diese. Null ohne Klient.
  sessionNumber: z.number().nullable(),
  // Nächster bestätigter Termin nach diesem.
  nextSessionAt: z.string().nullable(),
  // Die letzten gehaltenen Sitzungen vor diesem Termin, neueste zuerst.
  previousSessions: z.array(z.object({
    bookingId:       z.string(),
    start:           z.string(),
    durationMinutes: z.number(),
    offerName:       z.string(),
    // Klartext der Sitzungsnotiz, null = keine Notiz
    note:            z.string().nullable(),
  })),
});
export type CallClientContext = z.infer<typeof callClientContextSchema>;

// Betreten des Warteraums. Wie beim Bestätigen und Absagen ist der Token aus dem
// Mail-Link der einzige Ausweis des Klienten.
export const enterWaitingRoomSchema = z.object({
  token: z.string().min(1, 'Token ist erforderlich'),
});
export type EnterWaitingRoomDto = z.infer<typeof enterWaitingRoomSchema>;

// Chat im Call (doc/videocall-umsetzungsplan.md B7). Gespeichert wird der Verlauf, gesendet
// wird über die API – nicht über den LiveKit-Datenkanal, damit keine Nachricht ankommt, die
// nirgends liegt, und damit ein Abbruch nachgeholt werden kann.
export const CallChatSender = z.enum(['coach', 'client']);
export type CallChatSender = z.infer<typeof CallChatSender>;

/** Höchstlänge einer Nachricht. Ein Notbehelf und ein Link – kein Aufsatz. */
export const CALL_MESSAGE_MAX_LENGTH = 2000;
/** Obergrenze je Sitzung. Der Klient schreibt ohne Konto, deshalb überhaupt eine Grenze. */
export const CALL_MESSAGES_PER_BOOKING_LIMIT = 500;
/** Höchstgröße einer geteilten Datei. */
export const CALL_FILE_MAX_BYTES = 25 * 1024 * 1024;
/** Dateien je Sitzung – aus demselben Grund wie die Nachrichtengrenze. */
export const CALL_FILES_PER_BOOKING_LIMIT = 20;

/**
 * Was geteilt werden darf (doc/videocall-umsetzungsplan.md B7): Dokumente und Bilder, mit
 * denen ein Coach arbeitet. Formate mit Makros (`.docm` und Verwandte) sind nicht dabei.
 *
 * Endung und Typ gehören zusammen; der Server prüft zusätzlich die Dateisignatur, denn den
 * gemeldeten Typ liefert der Browser.
 */
export const CALL_FILE_TYPES: { extension: string; mimeType: string }[] = [
  { extension: 'pdf',  mimeType: 'application/pdf' },
  { extension: 'jpg',  mimeType: 'image/jpeg' },
  { extension: 'jpeg', mimeType: 'image/jpeg' },
  { extension: 'png',  mimeType: 'image/png' },
  { extension: 'webp', mimeType: 'image/webp' },
  { extension: 'docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  { extension: 'xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  { extension: 'pptx', mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' },
];

/** Für das `accept` des Dateifelds. */
export const CALL_FILE_ACCEPT = CALL_FILE_TYPES.map((type) => `.${type.extension}`).join(',');

export const sendCallMessageSchema = z.object({
  // Vom Browser erzeugt, damit ein zweiter Versuch nach einem Netzfehler keine zweite
  // Nachricht anlegt (unique je Buchung).
  clientMessageId: z.string().uuid('clientMessageId muss eine UUID sein'),
  text: z.string().trim().min(1, 'Nachricht ist erforderlich').max(CALL_MESSAGE_MAX_LENGTH, 'Nachricht ist zu lang'),
});
export type SendCallMessageDto = z.infer<typeof sendCallMessageSchema>;

// Datei mit optionalem Begleittext. Die Felder kommen als Multipart-Formular, also als
// Zeichenketten – der Text darf hier leer sein, die Datei ist die Nachricht.
export const sendCallFileSchema = z.object({
  clientMessageId: z.string().uuid('clientMessageId muss eine UUID sein'),
  text: z.string().trim().max(CALL_MESSAGE_MAX_LENGTH, 'Nachricht ist zu lang').optional(),
});
export type SendCallFileDto = z.infer<typeof sendCallFileSchema>;

export const sendClientCallFileSchema = sendCallFileSchema.extend({
  token: z.string().min(1, 'Token ist erforderlich'),
});
export type SendClientCallFileDto = z.infer<typeof sendClientCallFileSchema>;

// Der Klient hat kein Konto; sein Ausweis ist wie überall der Token aus dem Mail-Link.
export const sendClientCallMessageSchema = sendCallMessageSchema.extend({
  token: z.string().min(1, 'Token ist erforderlich'),
});
export type SendClientCallMessageDto = z.infer<typeof sendClientCallMessageSchema>;

export const callChatMessageSchema = z.object({
  id:        z.string(),
  // Cursor für das Nachholen: Die Oberfläche fragt „was kam nach dieser Nummer?".
  seq:       z.number(),
  sender:    CallChatSender,
  text:      z.string(),
  createdAt: z.string(),
  // Geht mit hinaus, damit der Absender seine eigene, längst angezeigte Nachricht
  // wiedererkennt: Holt die Oberfläche neue Nachrichten nach, während die Antwort auf ihr
  // eigenes POST noch unterwegs ist, stünde sie sonst zweimal auf dem Schirm. Für die
  // Gegenseite ist der Wert eine bedeutungslose UUID.
  clientMessageId: z.string(),
  // Die geteilte Datei, falls die Nachricht eine trägt. Kein Link auf S3: Der Download läuft
  // über die API, die den Zugang beim Klick prüft und dann auf eine frisch signierte URL
  // weiterleitet (B7). Ein Link im Verlauf liefe sonst nach 15 Minuten ins Leere.
  file: z.object({
    id:       z.string(),
    name:     z.string(),
    mimeType: z.string(),
    size:     z.number(),
    // Maße des Vorschaubilds, nur bei Bildern. Null heißt: kein Vorschaubild, die Datei
    // erscheint als Zeile mit Name und Größe.
    preview:  z.object({ width: z.number(), height: z.number() }).nullable(),
  }).nullable(),
});
export type CallChatMessageResponse = z.infer<typeof callChatMessageSchema>;

export const callChatMessagesResponseSchema = z.object({
  messages: z.array(callChatMessageSchema),
});
export type CallChatMessagesResponse = z.infer<typeof callChatMessagesResponseSchema>;

// Klientenverwaltung (CRM, siehe doc/funktionen/backoffice-coach.md Abschnitt 3).
// Die E-Mail ist Pflicht, weil sie der Matching-Schlüssel für spätere Online-Buchungen
// ist – ein Klient ohne Adresse wäre für den automatischen Weg unauffindbar.
export const createClientSchema = z.object({
  name:  z.string().min(1, 'Name ist erforderlich').max(160),
  email: z.string().email('Ungültige E-Mail-Adresse'),
  phone: z.string().max(40, 'Telefonnummer ist zu lang').nullish(),
  note:  z.string().max(2000, 'Notiz ist zu lang').nullish(),
});
export type CreateClientDto = z.infer<typeof createClientSchema>;

export const updateClientSchema = createClientSchema.partial();
export type UpdateClientDto = z.infer<typeof updateClientSchema>;

export const clientResponseSchema = z.object({
  id:        z.string(),
  name:      z.string(),
  email:     z.string(),
  phone:     z.string().nullable(),
  note:      z.string().nullable(),
  createdAt: z.string(),
});
export type ClientResponse = z.infer<typeof clientResponseSchema>;

// Listeneintrag mit den Kennzahlen aus Funktion 01: Anzahl gehaltener Sitzungen,
// letzte und nächste Sitzung. Alle drei werden serverseitig aggregiert.
export const clientListItemSchema = clientResponseSchema.extend({
  sessionCount:  z.number(),
  lastSessionAt: z.string().nullable(),
  nextSessionAt: z.string().nullable(),
});
export type ClientListItem = z.infer<typeof clientListItemSchema>;

// Klientenprofil (Funktion 02) inkl. vollständiger Sitzungshistorie.
export const clientDetailSchema = clientResponseSchema.extend({
  bookings: z.array(coachBookingResponseSchema),
});
export type ClientDetail = z.infer<typeof clientDetailSchema>;

// Kontolöschung durch den Coach selbst (Account-Seite). Läuft über eine Frist mit
// Widerrufsmöglichkeit statt als Sofort-Löschung – siehe doc/legal.md (30 Tage
// Aufbewahrung) und doc/technisches-konzept.md §17.
//
// Das Passwort ist Pflicht: die Löschung ist die einzige irreversible Aktion im
// Backoffice, eine offene Session allein soll sie nicht auslösen können.
export const requestAccountDeletionSchema = z.object({
  password: z.string().min(1, 'Passwort ist erforderlich'),
});
export type RequestAccountDeletionDto = z.infer<typeof requestAccountDeletionSchema>;

// `scheduledFor` = Zeitpunkt der endgültigen Löschung, NULL wenn keine läuft. Bewusst nur
// dieses eine Feld: die Frist wird beim Antrag einmal gerechnet und danach überall nur
// gelesen, damit Mailtext, Banner und Cron nicht je eigene Rechnungen anstellen.
export const accountDeletionStatusSchema = z.object({
  scheduledFor: z.string().nullable(),
});
export type AccountDeletionStatus = z.infer<typeof accountDeletionStatusSchema>;

// Betreiber-Backoffice: Coach-Verwaltung (doc/funktionen/backoffice-betreiber.md, Abschnitt 1).
// Bewusst eigene API-Endpunkte statt der better-auth admin-Plugin-Funktionen: die Liste
// verbindet user, member, organization und Kennzahlen aus clients/bookings – eine Projektion,
// die das Plugin nicht kennt. Das Plugin bleibt für die Schreibwege zuständig (Coach anlegen,
// sperren, Impersonation), wo seine Auth-Semantik der eigentliche Wert ist.

// Kontostatus eines Coachs. Abgeleitet aus user.banned/banExpires/emailVerified – nicht in
// der DB gespeichert. Bewusst OHNE 'trial': das ist eine Plan-Aussage, und es gibt weder
// Subscription-Tabelle noch Trial-Feld. Funktion 01 im Fachdokument wirft beide Achsen in
// eine Spalte; hier bleiben sie getrennt.
export const CoachStatus = z.enum(['active', 'pending', 'suspended']);
export type CoachStatus = z.infer<typeof CoachStatus>;

// Ein Coach = ein user (Rolle != 'admin') mit genau einer 'owner'-Mitgliedschaft in einer
// Organisation. `id` ist die user.id – sie ist der Schlüssel für alle Folgeaktionen
// (sperren, löschen, Impersonation), die später über das admin-Plugin laufen.
export const coachListItemSchema = z.object({
  id:               z.string(),
  name:             z.string(),
  email:            z.string(),
  registeredAt:     z.string(),            // ISO 8601, user.createdAt
  status:           CoachStatus,
  organizationId:   z.string(),
  organizationName: z.string(),
  subdomain:        z.string().nullable(), // organization.slug, laut Schema nullable
  clientCount:      z.number(),
  sessionCount:     z.number(),            // stattgefundene Sitzungen (bestätigt/abgeschlossen, in der Vergangenheit)
});
export type CoachListItem = z.infer<typeof coachListItemSchema>;

// Query-Parameter kommen als Strings an, daher z.coerce statt z.number (wie bei
// listCoachBookingsQuerySchema). `limit` ist Sicherheitsklammer, keine Pagination:
// bei erwarteten <100 Coachs wäre ein Offset-Envelope spekulativ.
// `plan` fehlt bewusst – ohne Subscription-Tabelle gibt es nichts zu filtern.
export const listCoachesQuerySchema = z.object({
  q:              z.string().trim().max(160, 'Suchbegriff ist zu lang').optional(),
  status:         CoachStatus.optional(),
  registeredFrom: z.string().datetime({ message: 'Ungültiger Zeitpunkt' }).optional(),
  registeredTo:   z.string().datetime({ message: 'Ungültiger Zeitpunkt' }).optional(),
  sort:           z.enum(['registeredAt', 'name', 'email', 'sessionCount', 'clientCount']).default('registeredAt'),
  order:          z.enum(['asc', 'desc']).default('desc'),
  limit:          z.coerce.number().int().min(1).max(500).default(200),
});
export type ListCoachesQuery = z.infer<typeof listCoachesQuerySchema>;
