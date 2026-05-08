import { z } from 'zod';

export const subscribeSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse').max(254),
  firstName: z.string().min(1).max(80).optional(),
  lastName: z.string().min(1).max(80).optional(),
  source: z.enum(['landing', 'coach-page', 'pricing']).default('landing'),
  role: z.enum(['coach', 'interessent', 'klient']).default('interessent'),
  consent: z.literal(true, {
    errorMap: () => ({ message: 'Einwilligung erforderlich' }),
  }),
});

export type SubscribeDto = z.infer<typeof subscribeSchema>;
