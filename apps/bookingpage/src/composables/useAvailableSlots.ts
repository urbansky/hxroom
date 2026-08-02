import { ref, watch } from 'vue';
import type { AvailableSlotResponse } from '@hxroom/shared';

export function useAvailableSlots(offerId: () => string) {
  const slots = ref<AvailableSlotResponse[]>([]);
  const loading = ref(true);

  async function load() {
    // Zurücksetzen, bevor der Fetch startet – sonst zeigt die UI kurzzeitig
    // (oder bei Fehlschlag dauerhaft) noch die Slots des vorherigen Angebots.
    slots.value = [];
    loading.value = true;

    const slug = window.location.hostname.split('.')[0];
    const apiUrl = import.meta.env.VITE_API_URL ?? 'http://api.hxroom.localhost';
    const url = `${apiUrl}/api/v1/organizations/${slug}/offers/${offerId()}/available-slots`;

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
  }

  watch(offerId, load, { immediate: true });

  return { slots, loading, refresh: load };
}
