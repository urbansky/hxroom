<script setup lang="ts">
import type { ClientListItem } from '@hxroom/shared'
import type { BookingInvitee } from '~/composables/useBookingInvitee'

// Die Felder zu useBookingInvitee: vorgegebener Klient, Auswahl aus der Klientenliste oder
// E-Mail-Adresse (UX-04). Im Spontan-Termin und beim manuellen Anlegen gleich gebaut.
//
// Bewusst kein ClientPicker: Der ist ein Slideover, und ein Slideover aus einem Modal
// heraus legt zwei überlagernde Ebenen übereinander. Für eine Auswahl aus einer bereits
// geladenen Liste genügt ein USelectMenu.
const props = defineProps<{
  invitee: BookingInvitee
  client?: { id: string, name: string } | null
  clients?: ClientListItem[]
}>()

// Eingabeflächen stehen weiß auf dem Modal-Grund (siehe AdHocSessionModal).
const inputUi = { base: 'bg-white dark:bg-neutral-800', content: 'bg-white dark:bg-neutral-900' }

const MODE_ITEMS = [
  { label: 'Klient', value: 'client', icon: 'i-lucide-user' },
  { label: 'E-Mail-Adresse', value: 'email', icon: 'i-lucide-mail' },
]

const { mode, selectedClientId, email, name, createClient, hasClients, byEmail, selectedClient } = props.invitee

// Die E-Mail steht als `description` unter dem Namen: Zwei Klienten mit gleichem oder
// ähnlichem Namen sind sonst nicht auseinanderzuhalten, und die Adresse ist das, was
// gleich den Zugangslink bekommt.
const clientItems = computed(() =>
  (props.clients ?? []).map(client => ({
    label: client.name,
    description: client.email,
    value: client.id,
  })),
)
</script>

<template>
  <UFormField v-if="client" label="Klient">
    <p class="text-highlighted">{{ client.name }}</p>
  </UFormField>

  <template v-else>
    <!-- basis-0: Ohne gemeinsame Ausgangsbreite verteilt `grow` nur den Rest, und
         der längere Text bekommt den breiteren Reiter. -->
    <UTabs v-if="hasClients" v-model="mode" :items="MODE_ITEMS" :content="false" size="sm" class="w-full" :ui="{ trigger: 'basis-0' }" />

    <!-- Beide Varianten liegen übereinander in derselben Rasterzelle, die inaktive
         unsichtbar: So nimmt der Bereich immer die Höhe der größeren ein, und das
         zentrierte Modal springt beim Umschalten nicht. -->
    <div class="grid">
      <div class="[grid-area:1/1] flex flex-col gap-4" :class="{ invisible: !byEmail }">
        <UFormField label="E-Mail-Adresse" required>
          <UInput v-model="email" type="email" autocomplete="off" placeholder="name@beispiel.de" class="w-full" :ui="inputUi" />
        </UFormField>

        <!-- Der Name steht in derselben Zeile wie der Haken und erscheint erst mit
             ihm – ein schneller Termin braucht nur die Adresse, und die Zeile hat
             mit und ohne Feld dieselbe Höhe. -->
        <div class="flex items-center gap-3 h-8">
          <UCheckbox v-model="createClient" label="Als Klient anlegen" class="shrink-0" />
          <UInput
            v-if="createClient"
            v-model="name"
            autocomplete="off"
            autofocus
            placeholder="Name (Pflicht)"
            aria-label="Name"
            required
            class="flex-1 min-w-0"
            :ui="inputUi"
          />
        </div>
      </div>

      <UFormField
        v-if="hasClients"
        label="Klient"
        :help="selectedClient
          ? `Die Einladung geht an ${selectedClient.email}.`
          : 'Die Einladung geht an die hinterlegte E-Mail-Adresse.'"
        class="[grid-area:1/1]"
        :class="{ invisible: byEmail }"
      >
        <USelectMenu
          v-model="selectedClientId"
          :items="clientItems"
          value-key="value"
          :filter-fields="['label', 'description']"
          placeholder="Klient wählen"
          class="w-full"
          :ui="inputUi"
        />
      </UFormField>
    </div>
  </template>
</template>
