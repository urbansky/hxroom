<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const features = [
  {
    icon: 'i-lucide-link',
    title: 'Subdomain & Buchungslink',
    description: 'Deine persönliche Subdomain (z. B. anna.hxroom.de) – sichtbar für Klienten beim Buchungslink.',
  },
  {
    icon: 'i-lucide-image-plus',
    title: 'Logo hochladen',
    description: 'Eigenes Logo für Warteraum, Buchungsseite und E-Mails – Klienten sehen deine Marke, nicht HxRoom.',
  },
  {
    icon: 'i-lucide-palette',
    title: 'Primärfarbe',
    description: 'Wähle eine Akzentfarbe, die auf deiner Buchungsseite und im Warteraum verwendet wird.',
  },
  {
    icon: 'i-lucide-user-circle',
    title: 'Profilseite: Biografie & Schwerpunkte',
    description: 'Kurzbeschreibung, Profilfoto und Coaching-Schwerpunkte – Grundlage für deine öffentliche Buchungsseite.',
  },
  {
    icon: 'i-lucide-globe',
    title: 'Eigene CNAME-Domain',
    description: 'Verknüpfe deine eigene Domain (z. B. buchen.anna-coaching.de) mit deinem HxRoom-Account.',
  },
]
</script>

<template>
  <div class="p-4 sm:p-6 max-w-2xl">
    <h1 class="font-serif text-3xl text-highlighted mb-2">Branding</h1>
    <p class="text-muted mb-8">Logo, Farbe und Profilseite – dein persönlicher Auftritt für Klienten.</p>

    <div class="flex flex-col gap-2">
      <UpcomingFeature
        v-for="item in features"
        :key="item.title"
        v-bind="item"
      />
    </div>
  </div>
</template>
