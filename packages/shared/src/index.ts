import { z } from 'zod';

// Booking status
export const BookingStatus = z.enum(['pending', 'confirmed', 'completed', 'cancelled']);
export type BookingStatus = z.infer<typeof BookingStatus>;

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
// (siehe apps/coach/app/pages/bookings/offers.vue). Das JSON ist reine Struktur
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

export const richTextDocSchema = z.object({
  type:    z.literal('doc'),
  content: z.array(richTextNodeSchema).optional(),
}).nullable()
  .refine((doc) => !doc || JSON.stringify(doc).length <= 20_000, 'Beschreibung ist zu lang');
export type RichTextDoc = z.infer<typeof richTextDocSchema>;

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
// clientAccessToken fehlt hier genauso bewusst: er ist der Schlüssel zum Warteraum
// und darf die API nie verlassen.
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
});
export type CoachBookingResponse = z.infer<typeof coachBookingResponseSchema>;

// Query-Parameter kommen als Strings an, daher z.coerce statt z.number.
export const listCoachBookingsQuerySchema = z.object({
  from:   z.string().datetime({ message: 'Ungültiger Zeitpunkt' }).optional(),
  to:     z.string().datetime({ message: 'Ungültiger Zeitpunkt' }).optional(),
  status: BookingStatus.optional(),
  limit:  z.coerce.number().int().min(1).max(500).default(200),
});
export type ListCoachBookingsQuery = z.infer<typeof listCoachBookingsQuerySchema>;

// Absage durch den Coach. Der Grund ist optional und geht in die Storno-Mail an den Klienten.
export const cancelBookingSchema = z.object({
  reason: z.string().max(500, 'Grund ist zu lang').optional(),
});
export type CancelBookingDto = z.infer<typeof cancelBookingSchema>;
