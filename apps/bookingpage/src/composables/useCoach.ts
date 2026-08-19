import { ref, onMounted } from 'vue';
import { apiUrl, orgSlug } from '../utils/api';

export interface CoachProfile {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  avatarUpdatedAt: string | null;
}

export const COACH_KEY = Symbol('coach');

// Öffentlicher Proxy-Read-Endpoint (kein Presigned-URL-Mechanismus), siehe
// doc/s3-verzeichnisschema.md. `null`, solange der Coach kein Profilbild hochgeladen hat.
export function getAvatarUrl(coach: CoachProfile): string | null {
  if (!coach.avatarUpdatedAt) return null;
  return `${apiUrl}/api/v1/booking-page/avatar/${coach.id}?v=${new Date(coach.avatarUpdatedAt).getTime()}`;
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
