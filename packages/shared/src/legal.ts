import { z } from 'zod';

// Impressum des Coachs für seine Buchungsseite (doc/legal.md §3.2). Geteilt zwischen API
// (Prüfung beim Speichern, Buchungssperre), Coach-App (Formular unter Einstellungen →
// Rechtliches) und Buchungsseite (Seite /impressum).

/** Rechtsformen zur Auswahl. Nur bei Gesellschaften fragt das Formular nach Vertretungsberechtigten. */
export const LEGAL_FORMS = {
  sole: 'Einzelunternehmen / freiberuflich',
  gbr: 'GbR',
  partg: 'Partnerschaftsgesellschaft',
  ug: 'UG (haftungsbeschränkt)',
  gmbh: 'GmbH',
  other: 'Andere Rechtsform',
} as const;
export type LegalForm = keyof typeof LEGAL_FORMS;
const LEGAL_FORM_KEYS = Object.keys(LEGAL_FORMS) as [LegalForm, ...LegalForm[]];

export function isCompanyLegalForm(form: LegalForm | null | undefined): boolean {
  return !!form && form !== 'sole';
}

/**
 * Rechtsformen, die immer in einem Register stehen (Handels- bzw. Partnerschaftsregister) –
 * dort ist der Registereintrag Pflicht. Die GbR wird nur freiwillig eingetragen.
 */
export function requiresRegister(form: LegalForm | null | undefined): boolean {
  return form === 'ug' || form === 'gmbh' || form === 'partg';
}

/** Wirtschafts-Identifikationsnummer (§ 139c AO): DE, neun Ziffern, Bindestrich, fünf Ziffern. */
export function isBusinessId(value: string | null | undefined): boolean {
  return !!value && /^DE\s?\d{9}-\d{5}$/i.test(value.trim());
}

const httpUrl = z.string().trim().max(500).url().refine((v) => /^https?:\/\//i.test(v), 'Only http(s) links are allowed');

/**
 * Angaben nach § 5 DDG. Telefon ist Pflicht: Neben der E-Mail verlangt das Gesetz einen
 * zweiten schnellen Kontaktweg, und ein Kontaktformular gibt es auf der Buchungsseite nicht.
 * Bei Gesellschaften kommen Vertretungsberechtigte hinzu, bei eingetragenen Rechtsformen der
 * Registereintrag. `vatId` nimmt die USt-IdNr. oder die Wirtschafts-ID auf – beide sind
 * Pflicht, falls vorhanden, und eine von beiden genügt.
 */
export const imprintSchema = z.object({
  name:           z.string().trim().min(1).max(160),
  street:         z.string().trim().min(1).max(160),
  postalCode:     z.string().trim().min(3).max(12),
  city:           z.string().trim().min(1).max(100),
  country:        z.string().trim().min(1).max(60),
  email:          z.string().trim().max(254).email(),
  phone:          z.string().trim().min(5).max(40).regex(/^\+?[0-9 ()/.\-–]+$/),
  legalForm:      z.enum(LEGAL_FORM_KEYS).nullish(),
  representative: z.string().trim().max(200).nullish(),
  register:       z.string().trim().max(200).nullish(),
  vatId:          z.string().trim().max(30).nullish(),
  addition:       z.string().trim().max(1000).nullish(),
}).superRefine((value, ctx) => {
  if (isCompanyLegalForm(value.legalForm) && !value.representative?.trim()) {
    ctx.addIssue({ code: 'custom', path: ['representative'], message: 'Companies must name their authorised representatives' });
  }
  if (requiresRegister(value.legalForm) && !value.register?.trim()) {
    ctx.addIssue({ code: 'custom', path: ['register'], message: 'This legal form requires a register entry' });
  }
});
export type Imprint = z.infer<typeof imprintSchema>;

export type ImprintMode = 'form' | 'link';

/**
 * Eingabe unter Einstellungen → Rechtliches. Gespeichert wird ausdrücklich, nicht per
 * Autosave, und nur mit Bestätigung: Sie gilt immer für genau den gespeicherten Stand.
 */
export const bookingPageLegalSchema = z.object({
  imprintMode: z.enum(['form', 'link']),
  imprint:     imprintSchema.nullish(),
  imprintUrl:  httpUrl.nullish(),
  privacyUrl:  httpUrl.nullish(),
  termsUrl:    httpUrl.nullish(),
  confirmed:   z.literal(true, 'Please confirm that the imprint is correct and complete'),
}).superRefine((value, ctx) => {
  if (value.imprintMode === 'form' && !value.imprint) {
    ctx.addIssue({ code: 'custom', path: ['imprint'], message: 'Imprint details are required' });
  }
  if (value.imprintMode === 'link' && !value.imprintUrl) {
    ctx.addIssue({ code: 'custom', path: ['imprintUrl'], message: 'A link to the imprint is required' });
  }
});
export type BookingPageLegalDto = z.infer<typeof bookingPageLegalSchema>;

/** Gespeicherter Stand, wie ihn API und Datenbank führen. */
export interface ImprintState {
  imprintMode: string | null;
  imprint: unknown;
  imprintUrl: string | null;
  imprintConfirmedAt: Date | string | null;
}

/**
 * Ob die Buchungsseite ein vollständiges Impressum hat – Voraussetzung dafür, dass Klienten
 * buchen können. Prüft den gespeicherten Stand erneut gegen das Schema, damit ein später
 * verschärftes Schema alte, nicht mehr gültige Angaben nicht durchwinkt.
 */
export function isImprintComplete(state: ImprintState | null | undefined): boolean {
  if (!state?.imprintConfirmedAt) return false;
  if (state.imprintMode === 'form') return imprintSchema.safeParse(state.imprint).success;
  if (state.imprintMode === 'link') return httpUrl.safeParse(state.imprintUrl).success;
  return false;
}
