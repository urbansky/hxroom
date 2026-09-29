<script setup lang="ts">
// Vue-APIs explizit, U-Komponenten beim Resolver – siehe Kommentar in CallVideoArea.
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { CallStats, CallStatsConnection, CallStatsVideo } from './types'

// Verbindungsdetails – nur im Debug-Modus (`?debug=1`) erreichbar.
//
// Für die Frage, woran ein weiches oder ruckelndes Bild liegt: Wie viel kommt an, mit welchem
// Codec, geht etwas verloren, und läuft das Gespräch direkt oder über TURN. Die Zahlen liest
// die App aus den RTC-Statistiken (`callQuality` in @hxroom/livekit); hier werden sie nur
// abgefragt und gezeigt.
//
// Abgefragt wird nur, solange das Fenster offen ist. Eigene Ebene (z-[100]) aus demselben
// Grund wie bei der Großansicht der Bilder: Seiten- und Steuerleiste lägen sonst darüber.

const open = defineModel<boolean>('open', { required: true })

const props = defineProps<{ load: () => Promise<CallStats> }>()

/** Takt der Abfrage. Kürzer glättet die Rate zu wenig, länger fühlt sich an wie Stillstand. */
const INTERVAL_MS = 2000

const stats = ref<CallStats | null>(null)
const failed = ref(false)
let timer: ReturnType<typeof setInterval> | undefined
let busy = false
let first = true

async function refresh() {
  if (busy) return
  busy = true
  try {
    const next = await props.load()
    // Die erste Messung nach dem Öffnen rechnet Bitrate und Verlust gegen den Stand vom
    // letzten Schließen – ein Durchschnitt über Minuten, der nichts über jetzt sagt. Was der
    // Server zum Senden meldet, gilt dagegen schon.
    stats.value = first
      ? {
          ...next,
          video: next.video.map(row => ({
            ...row,
            kbps: null,
            lossPercent: row.direction === 'send' ? row.lossPercent : null,
          })),
        }
      : next
    first = false
    failed.value = false
  }
  catch {
    failed.value = true
  }
  finally {
    busy = false
  }
}

function stop() {
  clearInterval(timer)
  timer = undefined
}

watch(open, (isOpen) => {
  stop()
  if (!isOpen) return
  stats.value = null
  first = true
  refresh()
  timer = setInterval(refresh, INTERVAL_MS)
}, { immediate: true })

onBeforeUnmount(stop)

// ---------------------------------------------------------------------------
// Beschriftung
// ---------------------------------------------------------------------------

const SOURCE: Record<string, string> = { camera: 'Kamera', screen_share: 'Bildschirm' }
const LIMITATION: Record<string, string> = { bandwidth: 'Bandbreite', cpu: 'CPU', other: 'Sonstiges' }

/** Ab hier färben die Werte warnend – Faustwerte für ein Gespräch, keine Norm. */
const WARN = { lossPercent: 2, jitterMs: 30, rttMs: 250 }

function route(connection: CallStatsConnection): string {
  const protocol = connection.protocol?.toUpperCase() ?? '?'
  switch (connection.candidateType) {
    case 'relay': return `Über TURN (${connection.relayProtocol?.toUpperCase() ?? protocol})`
    case 'host': return `Direkt (${protocol})`
    case 'srflx':
    case 'prflx': return `Direkt über NAT (${protocol})`
    default: return protocol
  }
}

function directions(connection: CallStatsConnection): string {
  if (connection.directions.length > 1) return 'Senden und Empfangen'
  return connection.directions[0] === 'send' ? 'Senden' : 'Empfangen'
}

function size(row: CallStatsVideo): string {
  return row.width && row.height ? `${row.width}×${row.height}` : '–'
}

function value(number: number | null, unit: string, digits = 0): string {
  if (number === null) return '–'
  const formatted = number.toLocaleString('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits })
  return `${formatted} ${unit}`
}

function warn(number: number | null, limit: number): string {
  return number !== null && number > limit ? 'text-warning font-medium' : ''
}

/** Gesendet zuerst, darin Kamera vor Bildschirm – dieselbe Ordnung bei jedem Takt. */
const videoRows = computed(() =>
  [...stats.value?.video ?? []].sort((a, b) =>
    a.direction.localeCompare(b.direction) * -1
    || a.source.localeCompare(b.source)
    || (a.layer ?? '').localeCompare(b.layer ?? '')),
)
</script>

<template>
  <UModal
    v-model:open="open"
    title="Verbindungsdetails"
    :description="`Aktualisiert alle ${INTERVAL_MS / 1000} Sekunden. Bitrate und Verlust stehen ab der zweiten Messung.`"
    :ui="{ overlay: 'z-[100]', content: 'z-[100] sm:max-w-4xl' }"
  >
    <template #body>
      <div class="flex flex-col gap-6 text-sm">
        <p v-if="failed" class="text-error">Die Messwerte ließen sich nicht lesen.</p>
        <p v-else-if="!stats" class="text-muted">Messe …</p>

        <template v-else>
          <section class="flex flex-col gap-2">
            <h3 class="font-medium text-highlighted">Verbindung</h3>
            <p v-if="stats.connections.length === 0" class="text-muted">Noch keine Spur, über die sich der Weg lesen ließe.</p>
            <div v-else class="overflow-x-auto">
              <table class="w-full tabular-nums">
                <thead class="text-left text-muted">
                  <tr>
                    <th class="py-1 pe-4 font-normal">Richtung</th>
                    <th class="py-1 pe-4 font-normal">Weg</th>
                    <th class="py-1 pe-4 font-normal">Round-Trip</th>
                    <th class="py-1 font-normal">Verfügbar zum Senden</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(connection, i) in stats.connections" :key="i" class="border-t border-default">
                    <td class="py-1.5 pe-4 whitespace-nowrap">{{ directions(connection) }}</td>
                    <td class="py-1.5 pe-4 whitespace-nowrap">{{ route(connection) }}</td>
                    <td class="py-1.5 pe-4 whitespace-nowrap" :class="warn(connection.rttMs, WARN.rttMs)">{{ value(connection.rttMs, 'ms') }}</td>
                    <td class="py-1.5 whitespace-nowrap">{{ value(connection.availableSendKbps, 'kbit/s') }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section class="flex flex-col gap-2">
            <h3 class="font-medium text-highlighted">Videospuren</h3>
            <p v-if="videoRows.length === 0" class="text-muted">Gerade läuft kein Video.</p>
            <div v-else class="overflow-x-auto">
              <table class="w-full tabular-nums">
                <thead class="text-left text-muted">
                  <tr>
                    <th class="py-1 pe-4 font-normal">Spur</th>
                    <th class="py-1 pe-4 font-normal">Auflösung</th>
                    <th class="py-1 pe-4 font-normal">Bilder</th>
                    <th class="py-1 pe-4 font-normal">Bitrate</th>
                    <th class="py-1 pe-4 font-normal">Verlust</th>
                    <th class="py-1 pe-4 font-normal">Jitter</th>
                    <th class="py-1 pe-4 font-normal">Codec</th>
                    <th class="py-1 pe-4 font-normal">Coder</th>
                    <th class="py-1 font-normal">Limit</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="row in videoRows"
                    :key="`${row.direction}:${row.source}:${row.layer ?? ''}`"
                    class="border-t border-default"
                  >
                    <td class="py-1.5 pe-4 whitespace-nowrap">
                      {{ row.direction === 'send' ? '↑' : '↓' }}
                      {{ SOURCE[row.source] ?? row.source }}
                      <span v-if="row.layer" class="text-muted">[{{ row.layer }}]</span>
                    </td>
                    <td class="py-1.5 pe-4 whitespace-nowrap">{{ size(row) }}</td>
                    <td class="py-1.5 pe-4 whitespace-nowrap">{{ value(row.fps, 'fps') }}</td>
                    <td class="py-1.5 pe-4 whitespace-nowrap">{{ value(row.kbps, 'kbit/s') }}</td>
                    <td class="py-1.5 pe-4 whitespace-nowrap" :class="warn(row.lossPercent, WARN.lossPercent)">{{ value(row.lossPercent, '%', 1) }}</td>
                    <td class="py-1.5 pe-4 whitespace-nowrap" :class="warn(row.jitterMs, WARN.jitterMs)">{{ value(row.jitterMs, 'ms') }}</td>
                    <td class="py-1.5 pe-4 whitespace-nowrap">{{ row.codec?.replace('video/', '') ?? '–' }}</td>
                    <!-- Darf umbrechen: Chromium nennt beim Simulcast jeden Encoder einzeln,
                         und die Zeile schöbe sonst die letzte Spalte aus dem Bild. -->
                    <td class="py-1.5 pe-4 min-w-40 text-muted">{{ row.implementation ?? '–' }}</td>
                    <td
                      class="py-1.5 whitespace-nowrap"
                      :class="row.limitation && row.limitation !== 'none' ? 'text-warning font-medium' : ''"
                    >
                      {{ row.limitation && row.limitation !== 'none' ? LIMITATION[row.limitation] ?? row.limitation : '–' }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </template>
      </div>
    </template>
  </UModal>
</template>
