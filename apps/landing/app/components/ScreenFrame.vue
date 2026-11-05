<script setup lang="ts">
// Browserrahmen um einen Screenshot oder einen stummen Loop. Ohne `src` zeigt er einen
// Platzhalter im selben Seitenverhältnis, bis die echten Bilder da sind (technisches-konzept.md §15).
//
// Mit `video` ist `src` das Poster: Es steht da, bis das Video läuft, und bleibt stehen, wenn
// der Besucher reduzierte Bewegung eingestellt hat. Der Loop startet erst im Browser, läuft
// nur, solange er im Bild ist, und lässt sich in der Titelleiste anhalten (WCAG 2.2.2).
//
// `mobile` ist eine eigene Fassung für schmale Bildschirme (unter 640 px) mit eigenem
// Seitenverhältnis. Das Poster liegt deshalb als <picture> unter dem Video: Das poster-Attribut
// kennt keine Media-Queries. Das Video selbst wählt seine Quelle per <source media>.
const MOBILE = '(max-width: 639px)'

const props = withDefaults(defineProps<{
  src?: string
  video?: string
  mobile?: { video: string, src: string, width: number, height: number }
  alt: string
  address?: string
  width?: number
  height?: number
  eager?: boolean
}>(), { width: 1440, height: 900, eager: false })

const ratio = computed(() => ({
  '--ratio': `${props.width} / ${props.height}`,
  '--ratio-mobile': props.mobile ? `${props.mobile.width} / ${props.mobile.height}` : `${props.width} / ${props.height}`,
}))

const videoEl = useTemplateRef<HTMLVideoElement>('videoEl')
const playing = ref(false)
// Hat der Besucher selbst angehalten (oder will keine Bewegung), startet der Loop nicht von allein wieder.
const heldByUser = ref(false)

function play() {
  videoEl.value?.play().catch(() => { playing.value = false })
}

function toggle() {
  const el = videoEl.value
  if (!el) return
  if (el.paused) {
    heldByUser.value = false
    play()
  }
  else {
    heldByUser.value = true
    el.pause()
  }
}

let observer: IntersectionObserver | undefined

onMounted(() => {
  if (!props.video || !videoEl.value) return
  heldByUser.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  observer = new IntersectionObserver(([entry]) => {
    if (!entry?.isIntersecting) videoEl.value?.pause()
    else if (!heldByUser.value) play()
  }, { threshold: 0.25 })
  observer.observe(videoEl.value)
})

onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <figure class="rounded-[14px] border border-(--ui-border) bg-(--ui-bg) shadow-[0_24px_60px_-28px_rgba(46,58,45,0.35)] overflow-hidden">
    <div class="flex items-center gap-3 px-4 h-9 border-b border-(--ui-border) bg-(--ui-bg-muted)">
      <div class="flex gap-1.5 shrink-0" aria-hidden="true">
        <span class="size-2.5 rounded-full bg-(--ui-bg-accented)" />
        <span class="size-2.5 rounded-full bg-(--ui-bg-accented)" />
        <span class="size-2.5 rounded-full bg-(--ui-bg-accented)" />
      </div>
      <div v-if="address" class="flex-1 min-w-0 flex justify-center">
        <span class="truncate text-[11px] text-(--ui-text-dimmed) bg-(--ui-bg) border border-(--ui-border) rounded-md px-3 py-0.5 max-w-[280px]">
          {{ address }}
        </span>
      </div>
      <UButton
        v-if="video"
        :icon="playing ? 'i-lucide-pause' : 'i-lucide-play'"
        :aria-label="playing ? 'Animation anhalten' : 'Animation abspielen'"
        color="neutral"
        variant="ghost"
        size="xs"
        class="ml-auto -mr-2 text-(--ui-text-dimmed)"
        @click="toggle"
      />
    </div>

    <div v-if="video" class="relative aspect-(--ratio) max-sm:aspect-(--ratio-mobile)" :style="ratio">
      <picture v-if="src">
        <source v-if="mobile" :media="MOBILE" :srcset="mobile.src">
        <img :src="src" alt="" fetchpriority="high" class="absolute inset-0 size-full object-cover">
      </picture>
      <video
        ref="videoEl"
        :aria-label="alt"
        muted
        loop
        playsinline
        disablepictureinpicture
        preload="metadata"
        class="absolute inset-0 size-full object-cover"
        @play="playing = true"
        @pause="playing = false"
      >
        <source v-if="mobile" :src="mobile.video" :media="MOBILE" type="video/mp4">
        <source :src="video" type="video/mp4">
      </video>
    </div>
    <img
      v-else-if="src"
      :src="src"
      :alt="alt"
      :width="width"
      :height="height"
      :loading="eager ? 'eager' : 'lazy'"
      decoding="async"
      class="block w-full h-auto"
    >
    <div
      v-else
      class="flex items-center justify-center bg-linear-to-br from-sage-100/70 to-gold-100/50 dark:from-sage-900/40 dark:to-gold-900/20"
      :style="{ aspectRatio: `${width} / ${height}` }"
      role="img"
      :aria-label="alt"
    >
      <span class="text-[12px] tracking-[0.12em] uppercase text-sage-600/70 dark:text-sage-200/60">Screenshot · {{ alt }}</span>
    </div>
  </figure>
</template>
