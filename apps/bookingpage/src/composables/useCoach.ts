import { ref, onMounted } from 'vue';
import type { BookingPageProfile } from '@hxroom/shared';
import { apiUrl, orgSlug } from '../utils/api';

export interface CoachProfile {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  avatarUpdatedAt: string | null;
  // Vom Coach unter Einstellungen → Buchungsseite gepflegt. Leere Felder blendet die Seite
  // aus, statt Beispieltext zu zeigen.
  tagline: string | null;
  bio: string | null;
  ctaButton: string | null;
  ctaIntro: string | null;
  jobTitle: string | null;
  topics: string[];
  quote: string | null;
  qualifications: string[];
  /** Eigene, zusätzliche Datenschutzerklärung bzw. AGB des Coachs (Einstellungen → Rechtliches). */
  privacyUrl: string | null;
  termsUrl: string | null;
  /**
   * Ohne vollständiges Impressum nimmt die Seite keine Buchungen an (doc/legal.md §3.2) –
   * statt der Buchungs-Buttons steht dann ein Hinweis. Die API lehnt Buchungen ebenso ab.
   */
  bookable: boolean;
}

export const COACH_KEY = Symbol('coach');

// Öffentlicher Proxy-Read-Endpoint (kein Presigned-URL-Mechanismus), siehe
// doc/s3-verzeichnisschema.md. `null`, solange der Coach kein Profilbild hochgeladen hat.
export function getAvatarUrl(coach: CoachProfile): string | null {
  if (!coach.avatarUpdatedAt) return null;
  return `${apiUrl}/api/v1/booking-page/avatar/${coach.id}?v=${new Date(coach.avatarUpdatedAt).getTime()}`;
}

/** Profil in der Form der geteilten Buchungsseiten-Komponenten (@hxroom/ui). */
export function toBookingPageProfile(coach: CoachProfile): BookingPageProfile {
  return {
    name:           coach.name,
    avatarUrl:      getAvatarUrl(coach),
    tagline:        coach.tagline,
    bio:            coach.bio,
    ctaButton:      coach.ctaButton,
    ctaIntro:       coach.ctaIntro,
    jobTitle:       coach.jobTitle,
    topics:         coach.topics,
    quote:          coach.quote,
    qualifications: coach.qualifications,
  };
}

export function useCoach() {
  const coach = ref<CoachProfile | null>(null);
  const loading = ref(true);
  const notFound = ref(false);

  onMounted(async () => {
    const slug = orgSlug();
    const url = `${apiUrl}/api/v1/organizations/${slug}`;

    console.log(`[useCoach] Slug: "${slug}", URL: ${url}`);

    try {
      const res = await fetch(url);
      console.log(`[useCoach] Response: ${res.status} ${res.statusText}`);

      if (res.ok) {
        coach.value = await res.json();
        console.log('[useCoach] Coach geladen:', coach.value);
      } else {
        console.warn(`[useCoach] Coach nicht gefunden (${res.status})`);
        notFound.value = true;
      }
    } catch (err) {
      console.error('[useCoach] Fetch-Fehler:', err);
      notFound.value = true;
    } finally {
      loading.value = false;
    }
  });

  return { coach, loading, notFound };
}
