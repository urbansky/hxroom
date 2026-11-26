<script setup lang="ts">
import screens from '~/data/handbuch-screens.json'

// Screenshot im Handbuch: `::screenshot{name="videocall/warteraum-coach" alt="…" caption="…"}`.
// Bild, Größe, Art, Adresszeile und Markierungen kommen aus dem Manifest, das
// scripts/handbuch-screens.mjs beim Aufnehmen schreibt; Alt-Text und Bildunterschrift stehen
// im Markdown (doc/marketing/handbuch.md §6.1, §8). Ohne `name` geht auch ein freies Bild mit
// `src`/`dark`/`width`/`height`.
//
// Ganze Seiten stehen im Browserrahmen der Startseite (ScreenFrame), Ausschnitte als Karte in
// ihrer natürlichen Breite, Handy-Bilder als schmale Karte mit runden Ecken. Ein Klick öffnet
// das Bild groß – im Fließtext ist es oft zu klein, um Beschriftungen zu lesen.
interface Screen {
  kind: 'page' | 'crop' | 'phone'
  src: string
  dark?: string
  width: number
  height: number
  address?: string
  markers?: { x: number, y: number }[]
}

const props = defineProps<{
  name?: string
  src?: string
  dark?: string
  alt: string
  caption?: string
  address?: string
  width?: number | string
  height?: number | string
}>()

const screen = computed<Screen>(() => {
  const entry = props.name ? (screens as Record<string, Screen>)[props.name] : undefined
  if (props.name && !entry) throw new Error(`Screenshot „${props.name}“ fehlt in app/data/handbuch-screens.json`)
  return entry ?? {
    kind: 'page',
    src: props.src ?? '',
    dark: props.dark,
    width: Number(props.width ?? 1440),
    height: Number(props.height ?? 900),
  }
})

const colorMode = useColorMode()
const open = ref(false)
// Bis zum Mount wählt der Browser per <source media> (statisches HTML kennt das Farbschema
// nicht), danach folgt das Bild der Einstellung der Seite – wie in ScreenFrame.
const mounted = ref(false)
onMounted(() => { mounted.value = true })
const large = computed(() => (colorMode.value === 'dark' && screen.value.dark) ? screen.value.dark : screen.value.src)
const markerStyle = (m: { x: number, y: number }) => ({ left: `${m.x}%`, top: `${m.y}%` })
// Breite im Text: Ausschnitte in natürlicher Größe, Handys etwa so breit wie ein echtes.
const inlineMaxWidth = computed(() => {
  if (screen.value.kind === 'phone') return '300px'
  if (screen.value.kind === 'crop') return `${screen.value.width}px`
  return undefined
})
</script>

<template>
  <div class="my-8">
    <button
      type="button"
      class="block w-full text-left cursor-zoom-in rounded-[14px] focus-visible:outline-2 focus-visible:outline-primary"
      :class="screen.kind !== 'page' && 'mx-auto'"
      :style="inlineMaxWidth ? { maxWidth: inlineMaxWidth } : undefined"
      :aria-label="`${alt} – groß anzeigen`"
      @click="open = true"
    >
      <ScreenFrame
        v-if="screen.kind === 'page'"
        :src="screen.src"
        :dark="screen.dark ? { src: screen.dark } : undefined"
        :alt="alt"
        :address="address ?? screen.address"
        :width="screen.width"
        :height="screen.height"
      >
        <Marker v-for="(m, i) in screen.markers ?? []" :key="i" :n="i + 1" in-image class="absolute -translate-x-1/2 -translate-y-1/2 text-sm" :style="markerStyle(m)" />
      </ScreenFrame>

      <div
        v-else
        class="relative border border-(--ui-border) overflow-hidden shadow-[0_24px_60px_-28px_rgba(46,58,45,0.35)]"
        :class="screen.kind === 'phone' ? 'rounded-[28px] border-4 border-(--ui-border-accented)' : 'rounded-[14px]'"
      >
        <picture class="block">
          <source v-if="screen.dark && !mounted" media="(prefers-color-scheme: dark)" :srcset="screen.dark">
          <img :src="mounted ? large : screen.src" :alt="alt" :width="screen.width" :height="screen.height" loading="lazy" decoding="async" class="block w-full h-auto">
        </picture>
        <Marker v-for="(m, i) in screen.markers ?? []" :key="i" :n="i + 1" in-image class="absolute -translate-x-1/2 -translate-y-1/2 text-sm" :style="markerStyle(m)" />
      </div>
    </button>
    <p v-if="caption" class="mt-3 text-sm text-(--ui-text-muted) leading-relaxed" :class="screen.kind !== 'page' && 'text-center'">
      {{ caption }}
    </p>

    <!-- Auf dem Handy bliebe ein Bild in Fensterbreite so klein wie im Text: Dort steht es in
         lesbarer Breite und lässt sich seitlich schieben. -->
    <UModal v-model:open="open" :title="alt" fullscreen :ui="{ body: 'flex items-center sm:justify-center overflow-auto bg-(--ui-bg-muted)' }">
      <template #body>
        <!-- So breit, wie Fensterbreite und -höhe zulassen; die Höhe folgt aus dem Seitenverhältnis. -->
        <div
          class="relative shrink-0"
          :class="screen.kind === 'page'
            ? 'w-[1100px] sm:w-[min(100%,calc((100dvh_-_7rem)*var(--ratio)))]'
            : 'w-[min(100%,calc((100dvh_-_7rem)*var(--ratio)))]'"
          :style="{
            '--ratio': `${screen.width / screen.height}`,
            'aspectRatio': `${screen.width} / ${screen.height}`,
            'maxWidth': screen.kind !== 'page' ? `${screen.kind === 'phone' ? 430 : screen.width * 1.5}px` : undefined,
          }"
        >
          <img :src="large" :alt="alt" class="size-full object-contain rounded-lg">
          <Marker v-for="(m, i) in screen.markers ?? []" :key="i" :n="i + 1" in-image class="absolute -translate-x-1/2 -translate-y-1/2 text-base" :style="markerStyle(m)" />
        </div>
      </template>
    </UModal>
  </div>
</template>
