import { ref, onMounted } from 'vue';
import type { OfferResponse } from '@hxroom/shared';

export const OFFERS_KEY = Symbol('offers');
export type UseOffersReturn = ReturnType<typeof useOffers>;

export function useOffers() {
  const offers = ref<OfferResponse[]>([]);
  const loading = ref(true);

  onMounted(async () => {
    const slug = window.location.hostname.split('.')[0];
    const apiUrl = import.meta.env.VITE_API_URL ?? 'http://api.hxroom.localhost';
    const url = `${apiUrl}/api/v1/organizations/${slug}/offers`;

    try {
      const res = await fetch(url);
      if (res.ok) {
        offers.value = await res.json();
      }
    } catch {
      // Seite bleibt nutzbar, Sitzungsarten-Liste bleibt leer
    } finally {
      loading.value = false;
    }
  });

  return { offers, loading };
}
