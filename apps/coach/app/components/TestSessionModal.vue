<script setup lang="ts">
import type { AdHocBookingResponse } from '@hxroom/shared'
import { renderSVG } from 'uqr'

/**
 * Probe-Sitzung mit sich selbst (phase5-umsetzungsplan.md, Schritt 6a): Der Coach öffnet den
 * Warteraum per QR-Code auf dem Handy und lässt sich am Rechner selbst ein. Aufgebaut wie
 * AdHocSessionModal, nur ohne Klient und ohne Mail.
 *
 * Der QR-Code entsteht im Browser (uqr) – keine Anfrage an einen Dritten, der Zugangslink
 * verlässt das Gerät nicht.
 */
const open = defineModel<boolean>('open', { required: true })
// Damit das Dashboard die neue Probe-Sitzung gleich in der Agenda zeigt.
const emit = defineEmits<{ created: [] }>()

const { $api } = useApi()
const toast = useToast()

const pending = ref(false)
const errorMessage = ref<string | null>(null)
const created = ref<AdHocBookingResponse | null>(null)

const qrSvg = computed(() => (created.value ? renderSVG(created.value.callUrl, { border: 1 }) : ''))

watch(open, (isOpen) => {
  if (!isOpen) return
  errorMessage.value = null
  created.value = null
})

async function start() {
  pending.value = true
  errorMessage.value = null
  try {
    created.value = await $api<AdHocBookingResponse>('/bookings/test-session', { method: 'POST' })
    emit('created')
  } catch (err: any) {
    errorMessage.value = err?.statusCode === 409
      ? 'Richte zuerst die Adresse deiner Buchungsseite ein – dort liegt der Warteraum.'
      : 'Die Probe-Sitzung konnte nicht gestartet werden.'
  } finally {
    pending.value = false
  }
}

async function copyLink() {
  if (!created.value) return
  try {
    await navigator.clipboard.writeText(created.value.callUrl)
    toast.add({ title: 'Link kopiert', icon: 'i-lucide-check', color: 'success' })
  } catch {
    toast.add({ title: 'Kopieren nicht möglich', description: 'Markiere den Link und kopiere ihn von Hand.', color: 'warning' })
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Probe-Sitzung"
    description="Erlebe HxRoom von beiden Seiten: am Rechner als Coach, auf dem Handy als Klient."
  >
    <template #body>
      <div v-if="created" class="flex flex-col gap-4">
        <ol class="flex flex-col gap-2 text-sm list-decimal pl-5">
          <li>Scanne den Code mit dem Handy – du landest als Klient im Warteraum deiner Buchungsseite.</li>
          <li>Geh am Rechner zum Gespräch und lass dich selbst herein.</li>
        </ol>

        <div class="flex justify-center">
          <!-- eslint-disable-next-line vue/no-v-html -- SVG aus uqr, erzeugt aus dem eigenen Zugangslink -->
          <div class="size-48 rounded-lg border border-default bg-white p-2 [&_svg]:size-full" v-html="qrSvg" />
        </div>

        <UFormField label="Oder den Link öffnen">
          <div class="flex gap-2">
            <UInput :model-value="created.callUrl" readonly class="flex-1" :ui="{ base: 'bg-white dark:bg-neutral-800' }" />
            <UButton icon="i-lucide-copy" color="neutral" variant="outline" aria-label="Link kopieren" @click="copyLink" />
          </div>
        </UFormField>

        <UAlert
          icon="i-lucide-headphones"
          color="neutral"
          variant="soft"
          description="Zwei Geräte im selben Raum pfeifen ohne Kopfhörer. Schalte auf einem Gerät das Mikrofon stumm oder nutze Kopfhörer."
        />
      </div>

      <div v-else class="flex flex-col gap-3 text-sm">
        <UAlert v-if="errorMessage" icon="i-lucide-circle-x" color="error" variant="soft" :description="errorMessage" />
        <p>Du startest ein echtes Gespräch mit dir selbst, 15 Minuten. Probiere Warteraum, Video, Chat, Dateien und Notizen aus.</p>
        <p class="text-muted">Die Probe-Sitzung steht in deinem Kalender, zählt aber in keiner Kennzahl und legt keinen Klienten an. Nach 24 Stunden wird sie gelöscht.</p>
      </div>
    </template>

    <template #footer>
      <div class="flex gap-3 justify-end w-full">
        <template v-if="created">
          <UButton color="neutral" variant="outline" label="Schließen" @click="open = false" />
          <UButton :to="`/call/${created.id}`" icon="i-lucide-video" label="Zum Gespräch" />
        </template>
        <template v-else>
          <UButton color="neutral" variant="outline" label="Abbrechen" @click="open = false" />
          <UButton icon="i-lucide-flask-conical" :loading="pending" label="Probe-Sitzung starten" @click="start" />
        </template>
      </div>
    </template>
  </UModal>
</template>
