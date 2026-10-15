<script setup lang="ts">
// Impressum des Betreibers (doc/legal.md §3.1) – die Angaben stehen nur hier.
//
// `full` auf hxroom.de/impressum. `operator` als Block „Technischer Betrieb“ im Impressum
// einer Buchungsseite (§3.2): dort nur Anbieter und Kontakt. Haftung und Streitbeilegung
// gehören zum Anbieter der Inhalte, und das ist auf der Buchungsseite der Coach.
//
// Stile aus theme/legal.css.
const { variant = 'full' } = defineProps<{ variant?: 'full' | 'operator' }>()
</script>

<template>
  <section class="legal-section">
    <div class="legal-section-label">{{ variant === 'operator' ? 'Technischer Betrieb' : 'Anbieter' }}</div>
    <div class="legal-card">
      <p v-if="variant === 'operator'" class="muted">
        Die Buchungsseite, den Warteraum und das Videogespräch stellt HxRoom bereit, im Auftrag des oben genannten Anbieters.
      </p>
      <p class="legal-address">
        <strong>Dr.-Ing. Stefan Urbansky</strong><br>
        Selbständiger Softwareentwickler<br>
        <br>
        Dresdner Landstraße 30e<br>
        01728 Bannewitz<br>
        Deutschland
      </p>
    </div>
  </section>

  <section class="legal-section">
    <div class="legal-section-label">Kontakt{{ variant === 'operator' ? ' HxRoom' : '' }}</div>
    <div class="legal-card">
      <div class="legal-meta-grid">
        <div class="legal-meta-item">
          <div class="lbl">E-Mail</div>
          <div class="val"><a href="mailto:kontakt@hxroom.de">kontakt@hxroom.de</a></div>
        </div>
        <div class="legal-meta-item">
          <div class="lbl">Inhaltlich verantwortlich{{ variant === 'operator' ? ' für HxRoom' : '' }}</div>
          <div class="val">Dr.-Ing. Stefan Urbansky</div>
        </div>
      </div>
    </div>
  </section>

  <template v-if="variant === 'full'">
    <section class="legal-section">
      <div class="legal-section-label">Streitbeilegung</div>
      <div class="legal-card">
        <h3>Verbraucherschlichtungsstelle</h3>
        <p>Ich bin nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen (§ 36 Abs. 1 VSBG).</p>
      </div>
    </section>

    <section class="legal-section">
      <div class="legal-section-label">Haftung &amp; Urheberrecht</div>

      <div class="legal-card">
        <h3>Haftung für Inhalte</h3>
        <p>Als Diensteanbieter bin ich für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 DDG bin ich jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.</p>
      </div>

      <div class="legal-card">
        <h3>Haftung für Links</h3>
        <p>Diese Seite enthält gegebenenfalls Links zu externen Webseiten Dritter. Auf deren Inhalte habe ich keinen Einfluss und übernehme dafür keine Gewähr. Für die Inhalte verlinkter Seiten ist stets der jeweilige Anbieter verantwortlich.</p>
      </div>

      <div class="legal-card">
        <h3>Urheberrecht</h3>
        <p>Die auf dieser Seite veröffentlichten Inhalte unterliegen dem deutschen Urheberrecht. Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechts bedürfen der schriftlichen Zustimmung.</p>
      </div>
    </section>
  </template>
</template>
