import { ref, onMounted } from 'vue';
import type { AvailableSlotResponse } from '@hxroom/shared';

export function useAvailableSlots(offerId: string) {
  const slots = ref<AvailableSlotResponse[]>([]);
  const loading = ref(true);

  onMounted(async () => {
    const slug = window.location.hostname.split('.')[0];
    const apiUrl = import.meta.env.VITE_API_URL ?? 'http://api.hxroom.localhost';
    const url = `${apiUrl}/api/v1/organizations/${slug}/offers/${offerId}/available-slots`;

    try {
      const res = await fetch(url);
      if (res.ok) {
        slots.value = await res.json();
      }
    } catch {
      // Seite bleibt nutzbar, Terminliste bleibt leer
    } finally {
      loading.value = false;
    }
  });

  return { slots, loading };
}
