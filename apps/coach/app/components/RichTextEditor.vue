<script setup lang="ts">
// Der eine Rich-Text-Editor der Coach-App: Angebotsbeschreibung und Sitzungsnotizen.
//
// Die Extension-Konfiguration ist nicht frei wählbar, sie ist Teil der Sicherheitsgrenze:
// Die API prüft das Dokument gegen richTextDocSchema (@hxroom/shared), und das lässt genau
// die Knoten zu, die dieser Editor erzeugen kann – keine Bilder, keine Mentions, Überschriften
// nur der Stufen 2 und 3. Wer hier etwas freischaltet, muss das Schema mitziehen.

withDefaults(defineProps<{
  placeholder?: string
  /** Füllt die Höhe des Elternelements und scrollt im Inneren – für die Seitenleiste im Call. */
  fill?: boolean
}>(), {
  placeholder: undefined,
  fill: false,
})

// Bindet an UEditor (Tiptap) und wird serverseitig gegen richTextDocSchema validiert – hier
// bewusst locker typisiert, da Tiptaps eigener Content-Typ nicht mit unserem Zod-Typ
// deckungsgleich ist.
const content = defineModel<any>()

// Array von Arrays = Gruppen; UEditorToolbar fügt den Trenner automatisch
// zwischen den Gruppen ein (kein eigenes "separator"-Item nötig/vorgesehen).
const toolbarItems: any[] = [
  [
    { kind: 'mark', mark: 'bold', icon: 'i-lucide-bold', tooltip: { text: 'Fett' } },
    { kind: 'mark', mark: 'italic', icon: 'i-lucide-italic', tooltip: { text: 'Kursiv' } },
  ],
  [
    { kind: 'heading', level: 2, icon: 'i-lucide-heading-2', tooltip: { text: 'Überschrift' } },
    { kind: 'bulletList', icon: 'i-lucide-list', tooltip: { text: 'Liste' } },
    { kind: 'orderedList', icon: 'i-lucide-list-ordered', tooltip: { text: 'Nummerierte Liste' } },
  ],
  [
    { kind: 'link', icon: 'i-lucide-link', tooltip: { text: 'Link' } },
  ],
]
</script>

<template>
  <div
    class="rounded-lg border border-default overflow-hidden bg-white dark:bg-neutral-800"
    :class="fill && 'flex flex-col min-h-0'"
  >
    <UEditor
      v-model="content"
      content-type="json"
      :image="false"
      :mention="false"
      :starter-kit="{ heading: { levels: [2, 3] } }"
      :placeholder="placeholder"
      :ui="fill
        ? { root: 'flex-1 min-h-0 flex flex-col', content: 'overflow-y-auto', base: `min-h-full py-3 px-3 ${descriptionProseClasses}` }
        : { base: `min-h-32 py-3 sm:px-4 ${descriptionProseClasses}` }"
    >
      <template #default="{ editor }">
        <UEditorToolbar :editor="editor" :items="toolbarItems" class="border-b border-default px-2 py-1.5 shrink-0" />
      </template>
    </UEditor>
  </div>
</template>
