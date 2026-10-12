// Darstellungsregeln der öffentlichen Buchungsseite. Geteilt, weil die Vorschau unter
// Einstellungen → Buchungsseite (Coach-App) dieselbe Seite zeigen soll wie die Buchungsseite
// selbst – die Komponenten dazu liegen in @hxroom/ui (components/booking-page/).

/** Was die Buchungsseite vom Profil des Coachs zeigt; leere Felder blendet sie aus. */
export interface BookingPageProfile {
  name: string;
  avatarUrl: string | null;
  tagline: string | null;
  bio: string | null;
  ctaButton: string | null;
  ctaIntro: string | null;
  jobTitle: string | null;
  topics: string[];
  quote: string | null;
  qualifications: string[];
}

/** Beschriftung der Buchungs-Buttons: der Text des Coachs, sonst ein neutraler Standard. */
export function bookingPageCtaLabel(ctaButton: string | null | undefined): string {
  return ctaButton?.trim() || 'Termin buchen';
}

/** Ob „Über mich“ etwas zu zeigen hat – sonst entfallen Abschnitt, Sprungmarke und Button. */
export function hasBookingPageAbout(profile: Pick<BookingPageProfile, 'bio' | 'quote' | 'qualifications'> | null | undefined): boolean {
  return !!(profile?.bio?.trim() || profile?.quote?.trim() || profile?.qualifications.length);
}

export function formatOfferPrice(cents: number | null): string {
  if (cents === null) return 'Kostenlos';
  return (cents / 100).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}
