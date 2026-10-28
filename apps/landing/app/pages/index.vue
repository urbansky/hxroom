<script setup lang="ts">
import { FAQ_ITEMS } from '~/utils/faq'

const title = 'Videoplattform für Coaches – Buchung & Videocall | HxRoom'
const description = 'Terminbuchung und Videocall für dein Coaching in einem – die DSGVO-konforme Zoom-Alternative. Klienten ohne Konto, Server in Deutschland. Jetzt in der Beta.'

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
            description: 'Videoplattform für Coaches – Terminbuchung und Videocall in einem, DSGVO-konform, Server in Deutschland.',
          },
          {
            '@type': 'SoftwareApplication',
            name: 'HxRoom',
            url: 'https://hxroom.de',
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web',
            inLanguage: 'de',
            // Wie die FAQ: In der Beta kostet HxRoom nichts. Der reguläre Preis kommt hierher,
            // sobald er zum offiziellen Start feststeht.
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR', description: 'Kostenlos während der Beta' },
            description: 'Terminbuchung und Videocall für Coaches in einem – Buchungsseite, Warteraum und Gespräch unter dem eigenen Namen. Klienten ohne Konto, DSGVO-konform, Server in Deutschland.',
            featureList: [
              'Buchungsseite mit eigenem Namen',
              'Videocall mit Warteraum',
              'Bestätigungs- und Erinnerungsmails',
              'Notizen, Chat und Dateien im Gespräch',
              'Kein Account für Klienten erforderlich',
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
