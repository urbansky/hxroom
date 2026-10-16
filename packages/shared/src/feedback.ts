import { z } from 'zod';

// Feedback-Knopf der Coach-App (doc/phase5-umsetzungsplan.md, Schritt 7a).

export const FEEDBACK_CATEGORIES = ['problem', 'idea', 'other'] as const;
export const FeedbackCategory = z.enum(FEEDBACK_CATEGORIES);
export type FeedbackCategory = z.infer<typeof FeedbackCategory>;

export const FEEDBACK_CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  problem: 'Problem',
  idea:    'Idee',
  other:   'Sonstiges',
};

export const FEEDBACK_MESSAGE_MAX_LENGTH = 2000;

export const createFeedbackSchema = z.object({
  category: FeedbackCategory,
  message:  z.string().trim()
    .min(1, 'Bitte schreib uns ein paar Worte.')
    .max(FEEDBACK_MESSAGE_MAX_LENGTH, `Höchstens ${FEEDBACK_MESSAGE_MAX_LENGTH} Zeichen.`),
  // Pfad der Seite, auf der der Coach war. Der Query-String wird abgeschnitten, auch wenn
  // die App ihn schon weglässt: Darin könnten Token oder Suchbegriffe stehen.
  page: z.string().trim().max(500).transform((path) => path.split(/[?#]/)[0] || '/'),
});
export type CreateFeedbackDto = z.infer<typeof createFeedbackSchema>;

export const feedbackItemSchema = z.object({
  id:        z.string(),
  createdAt: z.string(), // ISO 8601
  category:  FeedbackCategory,
  message:   z.string(),
  page:      z.string(),
  userAgent: z.string().nullable(),
  coachName:  z.string(),
  coachEmail: z.string(),
  subdomain:  z.string().nullable(),
});
export type FeedbackItem = z.infer<typeof feedbackItemSchema>;

export const listFeedbackQuerySchema = z.object({
  category: FeedbackCategory.optional(),
  limit:    z.coerce.number().int().min(1).max(500).default(200),
});
export type ListFeedbackQuery = z.infer<typeof listFeedbackQuerySchema>;
