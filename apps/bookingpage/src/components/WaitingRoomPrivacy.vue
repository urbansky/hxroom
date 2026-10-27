<script setup lang="ts">
import { computed } from 'vue';
import type { CallPrivacy } from '@hxroom/shared';

// Datenschutz-Kasten im Warteraum (phase5-umsetzungsplan.md, 5b; zeitplan.md, Phase 5).
// Zwei Regeln: nur Tatsachen, die die Technik belegt – keine Wertungen wie "DSGVO-konform" –,
// und jede Aussage hängt an einem Wert aus `privacy`, den die API je Termin setzt. Für den
// Fall `true` gibt es noch keinen Text, weil es die Funktion noch nicht gibt: Die Zeile
// entfällt dann, statt etwas Falsches zu behaupten. Der Text kommt mit der Funktion.
//
// Die Icon-Namen stehen bewusst als Literale hier: Nur so bündelt der Build sie
// (clientBundle.scan in packages/ui/vite.ts).
const { privacy, coachName } = defineProps<{
  privacy: CallPrivacy;
  coachName: string;
}>();

interface Fact {
  icon: string;
  title: string;
  text: string;
}

const facts = computed<Fact[]>(() => {
  const list: Fact[] = [];
  if (!privacy.recording) {
    list.push({
      icon: 'i-lucide-video-off',
      title: 'Keine Aufzeichnung',
      text: 'Bild und Ton werden nicht aufgezeichnet.',
    });
  }
  // Bewusst ohne "Ende-zu-Ende": Der Videoserver entschlüsselt die Medien zum Weiterleiten.
  if (!privacy.endToEndEncrypted) {
    list.push({
      icon: 'i-lucide-lock',
      title: 'Verschlüsselte Übertragung',
      text: 'Bild und Ton laufen verschlüsselt über einen Videoserver in Deutschland. Er leitet sie nur weiter und speichert nichts davon.',
    });
  }
  list.push({
    icon: 'i-lucide-message-square',
    title: 'Chat und Dateien',
    text: `Nachrichten und Dateien aus dem Chat werden auf Servern in Deutschland gespeichert, bis ${coachName} sie löscht.`,
  });
  if (!privacy.transcription) {
    list.push({
      icon: 'i-lucide-bot-off',
      title: 'Keine KI',
      text: 'Es läuft keine Transkription und keine Auswertung durch KI.',
    });
  }
  return list;
});
</script>

<template>
  <section class="w-full rounded-xl border border-default bg-white dark:bg-neutral-900 p-4 text-left">
    <h2 class="text-sm font-medium text-highlighted mb-3">Was mit deinem Gespräch passiert</h2>
    <ul class="flex flex-col gap-3">
      <li v-for="fact in facts" :key="fact.title" class="flex items-start gap-3">
        <UIcon :name="fact.icon" class="size-4 text-primary shrink-0 mt-0.5" />
        <div class="min-w-0">
          <div class="text-sm font-medium text-highlighted">{{ fact.title }}</div>
          <p class="text-sm text-muted leading-relaxed">{{ fact.text }}</p>
        </div>
      </li>
    </ul>
    <!-- Neuer Tab, damit der Warteraum offen bleibt. -->
    <a href="/datenschutz" target="_blank" class="inline-block mt-3 text-xs text-primary underline underline-offset-2">
      Datenschutzerklärung von {{ coachName }}
    </a>
  </section>
</template>
