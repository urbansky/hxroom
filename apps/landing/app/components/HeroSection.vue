<script setup lang="ts">
// Erster Bildschirm: was HxRoom ist (Kennzeichen), was es leistet (Überschrift), wie es
// sich von Calendly und Zoom unterscheidet (Unterzeile). Die Marken stehen bewusst nur als
// sachlicher Vergleich in der Unterzeile. Stripe kommt dazu, sobald Klienten über HxRoom
// bezahlen können.
const content = {
  eyebrow: 'Videoplattform für Coaches · Beta',
  headline: 'Terminbuchung und Videocall für dein Coaching –',
  headlineEm: 'in einem.',
  sub: 'Statt Calendly und Zoom: Deine Klienten buchen auf deiner Seite, bekommen Bestätigung und Erinnerung und kommen per Link direkt in deinen Videocall – ohne Konto, ohne Download. Alles unter deinem Namen, Server in Deutschland.',
  note: '20 Minuten mit Stefan – oder gleich selbst loslegen, kostenlos in der Beta.',
}

// Hero-Loop in zwei Fassungen: 16:10 und unter 640 px Breite eine eigene 4:5-Fassung mit größerer
// Schrift. Beide gibt es hell und dunkel; ScreenFrame wählt nach dem Farbschema der Seite.
const loop = {
  video: '/video/hxroom-buchung-bis-videocall.mp4',
  poster: '/video/hxroom-buchung-bis-videocall-poster.webp',
  mobile: {
    video: '/video/hxroom-buchung-bis-videocall-mobil.mp4',
    src: '/video/hxroom-buchung-bis-videocall-mobil-poster.webp',
    width: 1080,
    height: 1350,
  },
  dark: {
    video: '/video/hxroom-buchung-bis-videocall-dunkel.mp4',
    src: '/video/hxroom-buchung-bis-videocall-dunkel-poster.webp',
    mobile: {
      video: '/video/hxroom-buchung-bis-videocall-mobil-dunkel.mp4',
      src: '/video/hxroom-buchung-bis-videocall-mobil-dunkel-poster.webp',
    },
  },
}

// Das Poster ist das größte Element im ersten Bildschirm (LCP): früh laden, je Bildschirmbreite und
// Farbschema des Systems nur eines – dieselben Media-Queries wie das <picture> in ScreenFrame.
const WIDE = '(min-width: 640px)'
const NARROW = '(max-width: 639px)'
const preload = (href: string, media: string) => ({ rel: 'preload', as: 'image', href, media, fetchpriority: 'high' as const })
useHead({
  link: [
    preload(loop.poster, `${WIDE} and (prefers-color-scheme: light)`),
    preload(loop.mobile.src, `${NARROW} and (prefers-color-scheme: light)`),
    preload(loop.dark.src, `${WIDE} and (prefers-color-scheme: dark)`),
    preload(loop.dark.mobile.src, `${NARROW} and (prefers-color-scheme: dark)`),
  ],
})
</script>

<template>
  <section id="top" class="relative z-1 px-6 lg:px-12 pt-[132px] pb-20 max-sm:pt-[104px] max-sm:pb-14 overflow-hidden">
    <div class="max-w-[1180px] mx-auto grid grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] gap-14 items-center max-lg:grid-cols-1 max-lg:gap-12">
      <div class="max-lg:text-center">
        <div class="a1 inline-flex items-center gap-2.5 bg-gold-400/8 border border-gold-400/22 rounded-full px-[18px] py-[7px] mb-8">
          <span class="size-1.5 rounded-full bg-gold-400 shrink-0 animate-pulse" />
          <span class="text-[11px] text-gold-700 dark:text-gold-300 tracking-[0.14em] uppercase">{{ content.eyebrow }}</span>
        </div>

        <h1 class="a2 font-serif text-[clamp(40px,4.6vw,64px)] font-light leading-[1.06] text-(--color-cream) tracking-[-0.02em] mb-6 text-balance">
          {{ content.headline }} <em class="italic text-gold-700 dark:text-gold-300 whitespace-nowrap">{{ content.headlineEm }}</em>
        </h1>

        <p class="a3 text-[18px] text-(--ui-text) opacity-85 leading-[1.65] max-w-[520px] mb-9 max-lg:mx-auto max-sm:text-[17px]">
          {{ content.sub }}
        </p>

        <div class="a4">
          <LandingCtas class="max-lg:justify-center" />
          <p class="mt-4 text-[13px] text-(--ui-text-muted)">{{ content.note }}</p>
        </div>
      </div>

      <div class="a5">
        <!-- Quelle des Loops: media/hero-video/ (doc/technik/hero-video.md). Ohne Adresszeile,
             weil er zwischen Buchungsseite, Mail und Call wechselt. -->
        <ScreenFrame
          :video="loop.video"
          :src="loop.poster"
          :mobile="loop.mobile"
          :dark="loop.dark"
          alt="Animierter Ablauf: Ein Klient bucht auf der Seite seines Coachs einen Termin, bekommt Bestätigung und Erinnerung per Mail, wartet im Warteraum, wird vom Coach eingelassen und das Videogespräch beginnt."
          :width="1440"
          :height="900"
        />
      </div>
    </div>
  </section>
</template>

<style scoped>
.a1 { animation: fadeUp 0.7s ease both; }
.a2 { animation: fadeUp 0.7s 0.1s ease both; }
.a3 { animation: fadeUp 0.7s 0.2s ease both; }
.a4 { animation: fadeUp 0.7s 0.3s ease both; }
.a5 { animation: fadeUp 0.9s 0.35s ease both; }

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (prefers-reduced-motion: reduce) {
  .a1, .a2, .a3, .a4, .a5 { animation: none; }
}
</style>
