<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const { session } = useAuth()

const features = [
  {
    icon: 'i-lucide-calendar-days',
    title: 'Tagesübersicht',
    description: 'Nächste Termine des Tages auf einen Blick – mit Klientenname und direktem Raumlink.',
  },
  {
    icon: 'i-lucide-bell-ring',
    title: '„Klient wartet"-Anzeige',
    description: 'Echtzeit-Benachrichtigung, wenn ein Klient den Warteraum betritt.',
  },
  {
    icon: 'i-lucide-list-checks',
    title: 'Onboarding-Checkliste',
    description: 'Schritt-für-Schritt-Anleitung zum Einrichten deines Accounts – verschwindet nach Abschluss.',
  },
]
</script>

<template>
  <div class="p-4 sm:p-6 flex flex-col gap-6">
    <div>
      <h1 class="font-serif text-3xl text-(--ui-text-highlighted)">
        Hallo, {{ session.data?.user?.name ?? '…' }}
      </h1>
      <p class="mt-1 text-sm text-(--ui-text-muted)">
        Willkommen in deinem Coach-Backoffice.
      </p>
    </div>

    <UAlert
      icon="i-lucide-construction"
      color="info"
      variant="soft"
      title="Dashboard in Entwicklung"
      description="Die Übersichtskacheln, der Kalender und die Klientenliste folgen in Phase 3 und 4."
    />

    <div class="grid gap-4 sm:grid-cols-3">
      <UCard>
        <div class="flex items-center gap-3">
          <UIcon name="i-lucide-calendar-check" class="size-8 text-primary shrink-0" />
          <div>
            <p class="text-xs text-(--ui-text-muted) uppercase tracking-wide">Nächster Termin</p>
            <USkeleton class="mt-1 h-5 w-32 rounded" />
          </div>
        </div>
      </UCard>

      <UCard>
        <div class="flex items-center gap-3">
          <UIcon name="i-lucide-users" class="size-8 text-primary shrink-0" />
          <div>
            <p class="text-xs text-(--ui-text-muted) uppercase tracking-wide">Klienten gesamt</p>
            <USkeleton class="mt-1 h-5 w-16 rounded" />
          </div>
        </div>
      </UCard>

      <UCard>
        <div class="flex items-center gap-3">
          <UIcon name="i-lucide-video" class="size-8 text-primary shrink-0" />
          <div>
            <p class="text-xs text-(--ui-text-muted) uppercase tracking-wide">Sitzungen diesen Monat</p>
            <USkeleton class="mt-1 h-5 w-16 rounded" />
          </div>
        </div>
      </UCard>
    </div>

    <div class="flex flex-col gap-2 max-w-2xl">
      <UpcomingFeature
        v-for="item in features"
        :key="item.title"
        v-bind="item"
      />
    </div>
  </div>
</template>
