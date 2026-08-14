<script setup lang="ts">
const { session } = useAuth()

const features = [
  {
    icon: 'i-lucide-users',
    title: 'Aktive Coachs',
    description: 'Wie viele Coachs sich heute, diese Woche und diesen Monat angemeldet haben.',
  },
  {
    icon: 'i-lucide-circle-dollar-sign',
    title: 'MRR auf einen Blick',
    description: 'Wiederkehrender Monatsumsatz mit Trend der letzten zwölf Monate.',
  },
  {
    icon: 'i-lucide-activity',
    title: 'Systemstatus',
    description: 'Erreichbarkeit von API, LiveKit, Redis und Datenbank.',
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
        Willkommen im Betreiber-Backoffice.
      </p>
    </div>

    <UAlert
      icon="i-lucide-construction"
      color="info"
      variant="soft"
      title="Backoffice im Aufbau"
      description="Die Oberfläche steht, die Auswertungen folgen mit dem Admin-Modul der API."
    />

    <div class="flex flex-col gap-3">
      <UpcomingFeature
        v-for="feature in features"
        :key="feature.title"
        :icon="feature.icon"
        :title="feature.title"
        :description="feature.description"
      />
    </div>
  </div>
</template>
