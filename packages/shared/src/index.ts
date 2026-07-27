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

// Landing page settings
export const landingPageSchema = z.object({
  subdomain:   z.string().min(3).max(63).regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/).optional(),
  profileName: z.string().min(1).max(160).optional(),
  tagline:     z.string().max(160).nullish(),
  bio:         z.string().max(2000).nullish(),
  ctaButton:   z.string().max(80).nullish(),
  ctaIntro:    z.string().max(160).nullish(),
});
export type LandingPageDto = z.infer<typeof landingPageSchema>;

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
