import { ref, onMounted } from 'vue';

export interface CoachProfile {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
}

export const COACH_KEY = Symbol('coach');

export function useCoach() {
  const coach = ref<CoachProfile | null>(null);
  const loading = ref(true);
  const notFound = ref(false);

  onMounted(async () => {
    const slug = window.location.hostname.split('.')[0];
    const apiUrl = import.meta.env.VITE_API_URL ?? 'http://api.hxroom.localhost';
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
