<script setup lang="ts">
import { ref } from 'vue';

// -- Table: Beispieldaten Klienten --
const clients = ref([
  { id: '1', name: 'Anna Bergmann', email: 'anna@example.de', nextSession: '2026-03-10 10:00', sessions: 12, status: 'active' },
  { id: '2', name: 'Thomas Richter', email: 'thomas@example.de', nextSession: '2026-03-11 14:00', sessions: 8, status: 'active' },
  { id: '3', name: 'Lena Schulz', email: 'lena@example.de', nextSession: '', sessions: 5, status: 'paused' },
  { id: '4', name: 'Markus Weber', email: 'markus@example.de', nextSession: '2026-03-12 09:00', sessions: 3, status: 'active' },
  { id: '5', name: 'Julia Fischer', email: 'julia@example.de', nextSession: '', sessions: 1, status: 'cancelled' },
]);

const columns = [
  { accessorKey: 'name' as const, header: 'Name' },
  { accessorKey: 'email' as const, header: 'E-Mail' },
  { accessorKey: 'nextSession' as const, header: 'Nächste Sitzung' },
  { accessorKey: 'sessions' as const, header: 'Sitzungen' },
  { accessorKey: 'status' as const, header: 'Status' },
];

// -- Table: Buchungen --
const bookings = ref([
  { id: '1', client: 'Anna Bergmann', date: '10.03.2026', time: '10:00', duration: 60, status: 'confirmed' },
  { id: '2', client: 'Thomas Richter', date: '11.03.2026', time: '14:00', duration: 60, status: 'confirmed' },
  { id: '3', client: 'Markus Weber', date: '12.03.2026', time: '09:00', duration: 90, status: 'pending' },
  { id: '4', client: 'Julia Fischer', date: '08.03.2026', time: '11:00', duration: 60, status: 'cancelled' },
  { id: '5', client: 'Lena Schulz', date: '07.03.2026', time: '16:00', duration: 60, status: 'completed' },
]);

const bookingColumns = [
  { accessorKey: 'client' as const, header: 'Klient' },
  { accessorKey: 'date' as const, header: 'Datum' },
  { accessorKey: 'time' as const, header: 'Uhrzeit' },
  { accessorKey: 'duration' as const, header: 'Dauer (Min.)' },
  { accessorKey: 'status' as const, header: 'Status' },
];

// -- Form State --
const formName = ref('');
const formEmail = ref('');
const formDuration = ref('60');
const formNotify = ref(true);
const formNotes = ref('');
const formDate = ref('');
const formTime = ref('');

const durationOptions = [
  { label: '30 Minuten', value: '30' },
  { label: '60 Minuten', value: '60' },
  { label: '90 Minuten', value: '90' },
];

// -- Tabs --
const tabItems = [
  { label: 'Übersicht', value: 'overview' },
  { label: 'Klienten', value: 'clients' },
  { label: 'Buchungen', value: 'bookings' },
  { label: 'Einstellungen', value: 'settings' },
];
const activeTab = ref('overview');

// -- Stats --
const stats = [
  { label: 'Sitzungen diese Woche', value: '8' },
  { label: 'Aktive Klienten', value: '14' },
  { label: 'Auslastung', value: '72%' },
  { label: 'Umsatz (Monat)', value: '4.260 €' },
];

// -- Toast (auto-imported by Nuxt UI) --
const toast = useToast();
function showToast() {
  toast.add({ title: 'Buchung bestätigt', description: 'Anna Bergmann – 10.03.2026, 10:00 Uhr', color: 'success' });
}

// -- Modal --
const modalOpen = ref(false);

// -- Slideover --
const slideoverOpen = ref(false);

// -- Dropdown --
const dropdownItems = [
  { label: 'Bearbeiten', icon: 'i-lucide-pencil' },
  { label: 'Duplizieren', icon: 'i-lucide-copy' },
  { type: 'separator' as const },
  { label: 'Löschen', icon: 'i-lucide-trash-2', color: 'error' as const },
];

// -- Breadcrumb --
const breadcrumbItems = [
  { label: 'Dashboard', to: '/' },
  { label: 'Klienten', to: '/clients' },
  { label: 'Anna Bergmann' },
];

// -- Timeline --
const timelineItems = [
  { label: 'Buchung erstellt', description: 'Anna Bergmann hat eine Sitzung gebucht.', icon: 'i-lucide-calendar-plus' },
  { label: 'Erinnerung gesendet', description: '24h vor der Sitzung.', icon: 'i-lucide-mail' },
  { label: 'Sitzung durchgeführt', description: '60 Min., Notizen gespeichert.', icon: 'i-lucide-video' },
  { label: 'Transkript erstellt', description: 'Whisper-Transkription abgeschlossen.', icon: 'i-lucide-file-text' },
];

// -- Status Badge Mapping --
function statusColor(status: string) {
  const map: Record<string, string> = {
    active: 'success',
    confirmed: 'success',
    completed: 'info',
    pending: 'warning',
    paused: 'neutral',
    cancelled: 'error',
  };
  return (map[status] || 'neutral') as any;
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    active: 'Aktiv',
    confirmed: 'Bestätigt',
    completed: 'Abgeschlossen',
    pending: 'Ausstehend',
    paused: 'Pausiert',
    cancelled: 'Storniert',
  };
  return map[status] || status;
}
</script>

<template>
  <div class="min-h-screen bg-(--ui-bg) text-(--ui-text)">
    <div class="max-w-6xl mx-auto px-6 py-10 space-y-16">

      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-serif font-semibold">Nuxt UI – Komponentenübersicht</h1>
          <p class="mt-2 text-(--ui-text-muted)">
            Wichtige Komponenten mit Beispieldaten für das Sitzraum Coach-Backoffice.
          </p>
        </div>
        <UColorModeButton size="lg" />
      </div>

      <!-- ═══════ Badges & Avatare ═══════ -->
      <section class="space-y-4">
        <h2 class="text-xl font-serif font-semibold">Badges & Avatare</h2>
        <div class="flex flex-wrap items-center gap-3">
          <UBadge color="success">Aktiv</UBadge>
          <UBadge color="warning">Ausstehend</UBadge>
          <UBadge color="error">Storniert</UBadge>
          <UBadge color="info">Abgeschlossen</UBadge>
          <UBadge color="neutral">Pausiert</UBadge>
        </div>
        <div class="flex items-center gap-3 mt-4">
          <UAvatar text="AB" size="sm" />
          <UAvatar text="TR" size="md" />
          <UAvatar text="LS" size="lg" />
          <UAvatarGroup size="md">
            <UAvatar text="AB" />
            <UAvatar text="TR" />
            <UAvatar text="LS" />
            <UAvatar text="+3" />
          </UAvatarGroup>
        </div>
      </section>

      <!-- ═══════ Buttons ═══════ -->
      <section class="space-y-4">
        <h2 class="text-xl font-serif font-semibold">Buttons</h2>
        <div class="flex flex-wrap items-center gap-3">
          <UButton>Primär</UButton>
          <UButton color="neutral" variant="outline">Sekundär</UButton>
          <UButton color="neutral" variant="ghost">Ghost</UButton>
          <UButton color="error" variant="soft">Löschen</UButton>
          <UButton icon="i-lucide-plus">Neue Sitzung</UButton>
          <UButton icon="i-lucide-video" color="success">Call starten</UButton>
          <UButton loading>Wird gespeichert…</UButton>
          <UButton disabled>Deaktiviert</UButton>
        </div>
      </section>

      <!-- ═══════ Alerts ═══════ -->
      <section class="space-y-4">
        <h2 class="text-xl font-serif font-semibold">Alerts</h2>
        <UAlert
          title="Nächste Sitzung in 15 Minuten"
          description="Anna Bergmann wartet im Warteraum."
          color="info"
          icon="i-lucide-clock"
        />
        <UAlert
          title="Buchung bestätigt"
          description="Thomas Richter – 11.03.2026, 14:00 Uhr"
          color="success"
          icon="i-lucide-check-circle"
        />
        <UAlert
          title="Zahlungsproblem"
          description="Die letzte Abbuchung ist fehlgeschlagen. Bitte Zahlungsmethode prüfen."
          color="error"
          icon="i-lucide-alert-triangle"
        />
      </section>

      <!-- ═══════ Cards / Stats ═══════ -->
      <section class="space-y-4">
        <h2 class="text-xl font-serif font-semibold">Cards & Statistiken</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <UCard v-for="stat in stats" :key="stat.label">
            <p class="text-sm text-(--ui-text-muted)">{{ stat.label }}</p>
            <p class="text-2xl font-semibold mt-1">{{ stat.value }}</p>
          </UCard>
        </div>
      </section>

      <!-- ═══════ Breadcrumb ═══════ -->
      <section class="space-y-4">
        <h2 class="text-xl font-serif font-semibold">Breadcrumb</h2>
        <UBreadcrumb :items="breadcrumbItems" />
      </section>

      <!-- ═══════ Tabs ═══════ -->
      <section class="space-y-4">
        <h2 class="text-xl font-serif font-semibold">Tabs</h2>
        <UTabs :items="tabItems" v-model="activeTab" />
      </section>

      <!-- ═══════ Datentabelle: Klienten ═══════ -->
      <section class="space-y-4">
        <h2 class="text-xl font-serif font-semibold">Datentabelle – Klienten</h2>
        <UTable :data="clients" :columns="columns">
          <template #name-cell="{ row }">
            <div class="flex items-center gap-2">
              <UAvatar :text="row.original.name.split(' ').map((n: string) => n[0]).join('')" size="xs" />
              <span class="font-medium">{{ row.original.name }}</span>
            </div>
          </template>
          <template #nextSession-cell="{ row }">
            <span v-if="row.original.nextSession">{{ row.original.nextSession }}</span>
            <span v-else class="text-(--ui-text-muted)">–</span>
          </template>
          <template #status-cell="{ row }">
            <UBadge :color="statusColor(row.original.status)" variant="subtle">
              {{ statusLabel(row.original.status) }}
            </UBadge>
          </template>
        </UTable>
      </section>

      <!-- ═══════ Datentabelle: Buchungen ═══════ -->
      <section class="space-y-4">
        <h2 class="text-xl font-serif font-semibold">Datentabelle – Buchungen</h2>
        <UTable :data="bookings" :columns="bookingColumns">
          <template #status-cell="{ row }">
            <UBadge :color="statusColor(row.original.status)" variant="subtle">
              {{ statusLabel(row.original.status) }}
            </UBadge>
          </template>
        </UTable>
      </section>

      <!-- ═══════ Formular ═══════ -->
      <section class="space-y-4">
        <h2 class="text-xl font-serif font-semibold">Formular – Neue Buchung</h2>
        <UCard class="max-w-lg">
          <form class="space-y-4" @submit.prevent>
            <UFormField label="Name des Klienten">
              <UInput v-model="formName" placeholder="z.B. Anna Bergmann" icon="i-lucide-user" />
            </UFormField>

            <UFormField label="E-Mail">
              <UInput v-model="formEmail" type="email" placeholder="anna@example.de" icon="i-lucide-mail" />
            </UFormField>

            <div class="grid grid-cols-2 gap-4">
              <UFormField label="Datum">
                <UInput v-model="formDate" type="date" />
              </UFormField>
              <UFormField label="Uhrzeit">
                <UInput v-model="formTime" type="time" />
              </UFormField>
            </div>

            <UFormField label="Dauer">
              <USelect v-model="formDuration" :items="durationOptions" />
            </UFormField>

            <UFormField label="Notizen">
              <UTextarea v-model="formNotes" placeholder="Optionale Anmerkungen zur Sitzung…" :rows="3" />
            </UFormField>

            <USwitch v-model="formNotify" label="Erinnerung per E-Mail senden" />

            <div class="flex gap-3 pt-2">
              <UButton type="submit" icon="i-lucide-calendar-plus">Buchung erstellen</UButton>
              <UButton color="neutral" variant="outline">Abbrechen</UButton>
            </div>
          </form>
        </UCard>
      </section>

      <!-- ═══════ Modal ═══════ -->
      <section class="space-y-4">
        <h2 class="text-xl font-serif font-semibold">Modal</h2>
        <UButton @click="modalOpen = true" icon="i-lucide-external-link">Modal öffnen</UButton>
        <UModal v-model:open="modalOpen" title="Sitzung beenden" description="Möchtest du die aktuelle Sitzung wirklich beenden?">
          <template #body>
            <p class="text-(--ui-text-muted)">Der Klient wird auf die Abschlussseite weitergeleitet. Notizen werden automatisch gespeichert.</p>
          </template>
          <template #footer>
            <div class="flex gap-3 justify-end">
              <UButton color="neutral" variant="outline" @click="modalOpen = false">Abbrechen</UButton>
              <UButton color="error" @click="modalOpen = false">Sitzung beenden</UButton>
            </div>
          </template>
        </UModal>
      </section>

      <!-- ═══════ Slideover ═══════ -->
      <section class="space-y-4">
        <h2 class="text-xl font-serif font-semibold">Slideover</h2>
        <UButton @click="slideoverOpen = true" color="neutral" variant="outline" icon="i-lucide-panel-right">Slideover öffnen</UButton>
        <USlideover v-model:open="slideoverOpen" title="Klienten-Details" description="Anna Bergmann">
          <template #body>
            <div class="space-y-4">
              <div>
                <p class="text-sm text-(--ui-text-muted)">E-Mail</p>
                <p>anna@example.de</p>
              </div>
              <div>
                <p class="text-sm text-(--ui-text-muted)">Sitzungen gesamt</p>
                <p>12</p>
              </div>
              <div>
                <p class="text-sm text-(--ui-text-muted)">Nächste Sitzung</p>
                <p>10.03.2026, 10:00 Uhr</p>
              </div>
              <div>
                <p class="text-sm text-(--ui-text-muted)">Status</p>
                <UBadge color="success" variant="subtle">Aktiv</UBadge>
              </div>
            </div>
          </template>
        </USlideover>
      </section>

      <!-- ═══════ Toast ═══════ -->
      <section class="space-y-4">
        <h2 class="text-xl font-serif font-semibold">Toast</h2>
        <UButton @click="showToast" icon="i-lucide-bell">Toast anzeigen</UButton>
      </section>

      <!-- ═══════ Dropdown ═══════ -->
      <section class="space-y-4">
        <h2 class="text-xl font-serif font-semibold">Dropdown Menu</h2>
        <UDropdownMenu :items="[dropdownItems]">
          <UButton color="neutral" variant="outline" icon="i-lucide-more-vertical">Aktionen</UButton>
        </UDropdownMenu>
      </section>

      <!-- ═══════ Timeline ═══════ -->
      <section class="space-y-4">
        <h2 class="text-xl font-serif font-semibold">Timeline – Sitzungsverlauf</h2>
        <UCard class="max-w-lg">
          <div class="space-y-6">
            <div v-for="(item, i) in timelineItems" :key="i" class="flex gap-3">
              <div class="flex flex-col items-center">
                <div class="w-8 h-8 rounded-full bg-(--ui-bg-elevated) flex items-center justify-center">
                  <UIcon :name="item.icon" class="w-4 h-4 text-(--ui-text-muted)" />
                </div>
                <div v-if="i < timelineItems.length - 1" class="w-px flex-1 bg-(--ui-border)" />
              </div>
              <div class="pb-6">
                <p class="font-medium text-sm">{{ item.label }}</p>
                <p class="text-sm text-(--ui-text-muted)">{{ item.description }}</p>
              </div>
            </div>
          </div>
        </UCard>
      </section>

      <!-- ═══════ Skeleton / Loading ═══════ -->
      <section class="space-y-4">
        <h2 class="text-xl font-serif font-semibold">Skeleton / Loading</h2>
        <div class="flex items-center gap-4">
          <USkeleton class="w-12 h-12 rounded-full" />
          <div class="space-y-2">
            <USkeleton class="w-48 h-4 rounded" />
            <USkeleton class="w-32 h-3 rounded" />
          </div>
        </div>
      </section>

      <!-- ═══════ Accordion ═══════ -->
      <section class="space-y-4">
        <h2 class="text-xl font-serif font-semibold">Accordion – FAQ</h2>
        <UAccordion
          :items="[
            { label: 'Wie funktioniert die Buchung?', content: 'Klienten erhalten einen personalisierten Link zu deiner Subdomain. Dort wählen sie einen freien Slot aus deinem Kalender und bestätigen die Buchung – ohne Account, ohne Login.' },
            { label: 'Ist Sitzraum DSGVO-konform?', content: 'Ja. Alle Server stehen in Deutschland (Hetzner). Video, Audio und Transkription verlassen nie den EU-Raum. Ein AVV wird bei der Registrierung automatisch abgeschlossen.' },
            { label: 'Kann ich mein eigenes Branding verwenden?', content: 'Ja. Du kannst dein Logo, deine Farben und eine persönliche Willkommensnachricht hinterlegen. Deine Klienten sehen ausschließlich dein Branding.' },
          ]"
        />
      </section>

      <!-- ═══════ Separator ═══════ -->
      <USeparator />

      <!-- ═══════ Tooltip & Kbd ═══════ -->
      <section class="space-y-4">
        <h2 class="text-xl font-serif font-semibold">Tooltip & Tastenkürzel</h2>
        <div class="flex items-center gap-6">
          <UTooltip text="Neue Sitzung erstellen">
            <UButton icon="i-lucide-plus" variant="outline" color="neutral" />
          </UTooltip>
          <div class="flex items-center gap-2 text-sm text-(--ui-text-muted)">
            <span>Suche öffnen:</span>
            <UKbd>⌘</UKbd>
            <UKbd>K</UKbd>
          </div>
        </div>
      </section>

      <!-- ═══════ Progress ═══════ -->
      <section class="space-y-4">
        <h2 class="text-xl font-serif font-semibold">Progress</h2>
        <div class="max-w-md space-y-3">
          <div>
            <p class="text-sm text-(--ui-text-muted) mb-1">Auslastung diese Woche</p>
            <UProgress :value="72" />
          </div>
          <div>
            <p class="text-sm text-(--ui-text-muted) mb-1">Transkription läuft…</p>
            <UProgress animation="carousel" />
          </div>
        </div>
      </section>

      <!-- ═══════ UTheme – Sektion mit Gold-Akzent ═══════ -->
      <section class="space-y-4">
        <h2 class="text-xl font-serif font-semibold">UTheme – Gold-Akzent Sektion</h2>
        <UTheme :ui="{ button: { slots: { base: 'font-serif' } } }">
          <div class="flex flex-wrap items-center gap-3">
            <UButton color="secondary">Gold Aktion</UButton>
            <UButton color="secondary" variant="outline">Gold Outline</UButton>
            <UButton color="secondary" variant="soft">Gold Soft</UButton>
          </div>
        </UTheme>
      </section>

      <!-- Footer Spacer -->
      <div class="h-20" />
    </div>
  </div>
</template>
