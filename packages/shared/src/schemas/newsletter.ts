import { z } from 'zod';

export const subscribeSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse').max(254),
  name: z.string().min(1).max(160).optional(),
  source: z.enum(['landing', 'coach-page', 'pricing']).default('landing'),
});

export type SubscribeDto = z.infer<typeof subscribeSchema>;
