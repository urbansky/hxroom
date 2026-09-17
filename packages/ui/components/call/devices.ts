import type { CallDevice } from './types'

/**
 * Geräte mit einem Namen, auch wenn der Browser (noch) keinen nennt.
 *
 * Vor der ersten Freigabe liefert der Browser Geräte ohne Bezeichnung. In einer Auswahlliste
 * stünden dann leere Zeilen; „Mikrofon 1, 2" ist wenigstens zählbar. Liegt hier, weil
 * Steuerleiste und Geräte-Einrichtung beider Apps dieselbe Liste zeigen.
 */
export function namedDevices(devices: readonly CallDevice[], fallback: string): CallDevice[] {
  return devices.map((device, i) => ({ id: device.id, label: device.label || `${fallback} ${i + 1}` }))
}
