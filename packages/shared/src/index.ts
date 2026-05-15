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
