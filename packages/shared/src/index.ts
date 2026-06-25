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
