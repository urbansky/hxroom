import { ref, onMounted } from 'vue';
import type { OfferResponse } from '@hxroom/shared';
import { apiUrl, orgSlug } from '../utils/api';

export const OFFERS_KEY = Symbol('offers');
export type UseOffersReturn = ReturnType<typeof useOffers>;

export function useOffers() {
  const offers = ref<OfferResponse[]>([]);
  const loading = ref(true);

  onMounted(async () => {
    const url = `${apiUrl}/api/v1/organizations/${orgSlug()}/offers`;

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
