<script setup lang="ts">
import { FAQ_ITEMS } from '~/utils/faq'

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
      // `textContent` statt des früheren `children`: unhead 3 typisiert Script-Tags nach
      // ihrem `type`, und für ld+json ist textContent die verlangte Schreibweise.
      textContent: JSON.stringify({
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
            mainEntity: FAQ_ITEMS.map(item => ({
              '@type': 'Question',
              name: item.q,
              acceptedAnswer: { '@type': 'Answer', text: item.a },
            })),
          },
        ],
      }),
    },
  ],
})
</script>

<template>
  <main>
    <HeroSection />
    <TrustBar />
    <ProblemSection />
    <TourSection />
    <CoachFeaturesSection />
    <AudienceSection />
    <AboutSection />
    <FaqSection />
    <FinalCtaSection />
  </main>
</template>
