<script setup lang="ts">
// Ein angedeutetes Kamerabild (doc/poc/videocall-v2.html, Screen 3).
//
// Bis LiveKit angebunden ist, überträgt der Prototyp kein Video – und eine leere Fläche
// verrät nichts darüber, wie die Oberfläche über einem Bild wirkt: ob die Namenspille
// untergeht, ob die Steuerleiste das Gesicht anschneidet, ob man das Weichzeichnen
// überhaupt bemerkt.
//
// Bewusst keine Fotografie und bewusst kein Gesicht: Eine erfundene Person in einem
// Produktentwurf ist spätestens im Screenshot nicht mehr als Attrappe zu erkennen. Die
// Silhouette genügt, um die Fläche zu beurteilen.
//
// Der Weichzeichner trifft allein den Raum, nie die Person – genau das ist die Zusage
// hinter "Eigenen Hintergrund weichzeichnen" (project.md §5a). Weil der Filter im
// Koordinatensystem der viewBox wirkt, stimmt seine Stärke im großen Bild wie im
// Vorschaufenster, ohne zweiten Wert.

withDefaults(defineProps<{
  /** Hintergrund weichzeichnen – die Person bleibt scharf. */
  blurred?: boolean
}>(), { blurred: false })
</script>

<template>
  <div class="absolute inset-0 overflow-hidden" aria-hidden="true">
    <!-- slice statt meet: Das Bild füllt die Fläche wie ein Kamerabild und lässt lieber
         einen Rand außerhalb, als Balken stehen zu lassen. -->
    <svg class="size-full" viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="sim-window" x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0%" stop-color="#FBF6E8" />
          <stop offset="100%" stop-color="#E4DECD" />
        </linearGradient>
        <radialGradient id="sim-light" cx="20%" cy="26%" r="60%">
          <stop offset="0%" stop-color="#FFF8E6" stop-opacity="0.55" />
          <stop offset="100%" stop-color="#FFF8E6" stop-opacity="0" />
        </radialGradient>
      </defs>

      <!-- Der Raum. Die Flächen reichen über die viewBox hinaus, sonst zöge der
           Weichzeichner einen hellen Saum an den Bildrand. -->
      <g :class="{ 'sim-blur': blurred }">
        <rect x="-30" y="-30" width="220" height="160" fill="#DED7C6" />
        <!-- Wandkante zum Möbelstück im Vordergrund: gibt dem Raum eine Tiefe, an der
             das Weichzeichnen überhaupt sichtbar wird. -->
        <rect x="-30" y="86" width="220" height="60" fill="#CCC3AF" />

        <!-- Fenster, die Lichtquelle links -->
        <rect x="14" y="16" width="26" height="37" fill="url(#sim-window)" />
        <rect x="26.5" y="16" width="1" height="37" fill="#CFC7B4" />
        <rect x="14" y="33" width="26" height="1" fill="#CFC7B4" />

        <!-- Bild an der Wand rechts -->
        <rect x="119" y="22" width="24" height="18" fill="#C2B9A3" stroke="#A69A83" stroke-width="1" />

        <rect x="-30" y="-30" width="220" height="160" fill="url(#sim-light)" />
      </g>

      <!-- Die Person: Haar, Kopf, Hals, Schultern. Kein Gesicht. -->
      <g>
        <rect x="76" y="58" width="8" height="20" fill="#B5946E" />
        <path d="M20 100 C 26 86 52 78 80 78 C 108 78 134 86 140 100 Z" fill="#6E7F6B" />
        <ellipse cx="80" cy="47" rx="10.5" ry="9.5" fill="#4E4236" />
        <ellipse cx="80" cy="52" rx="8.5" ry="10" fill="#C9A97A" />
      </g>
    </svg>

    <!-- Sensorrauschen. Ohne das wirken die Flächen wie eine Zeichnung, nicht wie ein Bild. -->
    <div class="sim-grain" />
  </div>
</template>

<style scoped>
.sim-blur {
  filter: blur(2.2px);
  transition: filter 0.3s;
}

.sim-grain {
  position: absolute;
  inset: 0;
  opacity: 0.5;
  pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E");
}
</style>
