<script setup lang="ts">
const title = 'Zoom-Alternative für Coaches – HxRoom'
const description = 'Dein gebrandeter Videocall-Raum für Coaches – ohne Zoom-Link, ohne Klienten-Account, ohne fremdes Logo. DSGVO-konform, Server in Deutschland.'

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: 'website',
  ogUrl: 'https://hxroom.de',
  ogSiteName: 'HxRoom',
  ogLocale: 'de_DE',
  twitterCard: 'summary_large_image',
  twitterTitle: title,
  twitterDescription: description,
})

useHead({
  link: [{ rel: 'canonical', href: 'https://hxroom.de' }],
  script: [
    {
      type: 'application/ld+json',
      children: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Organization',
            name: 'HxRoom',
            url: 'https://hxroom.de',
            founder: { '@type': 'Person', name: 'Stefan Urbansky', url: 'https://hxcode.io' },
            foundingLocation: { '@type': 'Place', addressCountry: 'DE' },
            description: 'Videocall-Plattform für Coaches – DSGVO-konform, White-Label, Server in Deutschland.',
          },
          {
            '@type': 'SoftwareApplication',
            name: 'HxRoom',
            url: 'https://hxroom.de',
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web',
            inLanguage: 'de',
            offers: { '@type': 'Offer', price: '19', priceCurrency: 'EUR', priceValidUntil: '2027-12-31' },
            description: 'Gebrandeter Videocall-Raum für Coaches – ohne Zoom-Link, ohne Klienten-Account. DSGVO-konform, Server in Deutschland.',
            featureList: [
              'White-Label Branding',
              'Buchungssystem',
              'Warteraum mit eigenem Logo',
              'Kein Account für Klienten erforderlich',
              'DSGVO-konform by Design',
              'Server in Deutschland',
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: 'Wann geht HxRoom live?',
                acceptedAnswer: { '@type': 'Answer', text: 'Geplanter Launch ist Q4 2026. Early-Access-Coaches bekommen Zugang, sobald die Kernfunktionen stabil laufen, voraussichtlich einige Wochen vor dem öffentlichen Start.' },
              },
              {
                '@type': 'Question',
                name: 'Was wird HxRoom kosten?',
                acceptedAnswer: { '@type': 'Answer', text: 'Die regulären Preise stehen erst zum Launch final fest. Early-Access-Coaches bekommen einen vergünstigten Einführungspreis auf Lebenszeit. Grobe Orientierung: Ab etwa 19 €/Monat.' },
              },
              {
                '@type': 'Question',
                name: 'Brauchen meine Klienten einen Account?',
                acceptedAnswer: { '@type': 'Answer', text: 'Nein. Klienten klicken auf einen Link und landen direkt im Warteraum. Kein Download, keine Registrierung, kein Passwort.' },
              },
              {
                '@type': 'Question',
                name: 'Wo liegen die Daten?',
                acceptedAnswer: { '@type': 'Answer', text: 'Auf Servern in Deutschland (Hetzner). Ein AVV ist Bestandteil des Vertrags, Subdienstleister sind transparent aufgeführt. Keine Weitergabe an US-Dienste.' },
              },
              {
                '@type': 'Question',
                name: 'Was passiert mit meinen Daten, wenn ich kündige?',
                acceptedAnswer: { '@type': 'Answer', text: 'Du bekommst einen vollständigen Export (Klienten, Sitzungen, Notizen) – danach werden deine Daten nach DSGVO-Vorgaben gelöscht.' },
              },
              {
                '@type': 'Question',
                name: 'Kann ich meinen Zoom behalten, bis HxRoom fertig ist?',
                acceptedAnswer: { '@type': 'Answer', text: 'Selbstverständlich. HxRoom ersetzt dein bisheriges Setup erst dann, wenn du bereit bist.' },
              },
            ],
          },
        ],
      }),
    },
  ],
})
</script>

<template>
  <main class="pt-17">
    <HeroSection />
    <ProblemSection />
    <VisionSection />
    <MockupPreview />
    <AudienceSection />
    <AboutSection />
<!--    <PromiseSection />-->
    <FaqSection />
    <FinalCtaSection />
  </main>
</template>
