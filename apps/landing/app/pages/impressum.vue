<script setup lang="ts">
definePageMeta({ layout: 'legal' })

useHead({
  title: 'Impressum · HxRoom',
  meta: [
    { name: 'description', content: 'Impressum nach § 5 DDG für HxRoom – Anbieter, Kontakt, Verantwortlichkeiten.' },
  ],
})
</script>

<template>
  <div class="legal-container">
    <span class="legal-eyebrow">Rechtliches</span>
    <h1 class="legal-headline">Impressum</h1>
    <p class="legal-sub">Angaben gemäß § 5 DDG. Wer hinter HxRoom steht und wie du mich erreichst.</p>

    <!-- ANBIETER -->
    <section class="legal-section">
      <div class="legal-section-label">Anbieter</div>
      <div class="legal-card">
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

    <!-- KONTAKT -->
    <section class="legal-section">
      <div class="legal-section-label">Kontakt</div>
      <div class="legal-card">
        <div class="legal-meta-grid">
          <div class="legal-meta-item">
            <div class="lbl">E-Mail</div>
            <div class="val"><a href="mailto:kontakt@hxroom.de">kontakt@hxroom.de</a></div>
          </div>
          <div class="legal-meta-item">
            <div class="lbl">Inhaltlich verantwortlich</div>
            <div class="val">Dr.-Ing. Stefan Urbansky</div>
          </div>
        </div>
      </div>
    </section>

    <!-- ÜBER DEN DIENST -->
    <section class="legal-section">
      <div class="legal-section-label">Über den Dienst</div>
      <div class="legal-card">
        <h2>HxRoom ist in Entwicklung</h2>
        <p>HxRoom ist ein in Entwicklung befindliches Online-Werkzeug für Coaches und Therapeut:innen. Diese Seite informiert über den Stand der Entwicklung und bietet die Möglichkeit, sich für einen Vorab-Newsletter einzutragen.</p>
        <p class="muted">Eine Nutzung der späteren Plattform ist über diese Seite noch nicht möglich.</p>
      </div>
    </section>

    <!-- STREITBEILEGUNG -->
    <section class="legal-section">
      <div class="legal-section-label">Streitbeilegung</div>
      <div class="legal-card">
        <h3>Verbraucherschlichtungsstelle</h3>
        <p>Ich bin nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen (§ 36 Abs. 1 VSBG).</p>
      </div>
    </section>

    <!-- HAFTUNG & URHEBERRECHT -->
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

    <p class="legal-updated">Stand: 14. Mai 2026</p>
  </div>
</template>

<style scoped>
.legal-container {
  max-width: 760px;
  margin: 0 auto;
}

.legal-eyebrow {
  display: inline-block;
  font-size: 11px;
  color: var(--color-gold-500);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  margin-bottom: 24px;
  padding: 6px 14px;
  background: color-mix(in srgb, var(--color-gold-400) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-gold-400) 22%, transparent);
  border-radius: 20px;
}

:global(.dark) .legal-eyebrow {
  color: var(--color-gold-300);
}

.legal-headline {
  font-family: var(--font-serif);
  font-size: clamp(40px, 5.5vw, 60px);
  font-weight: 300;
  line-height: 1.08;
  color: var(--ui-text-highlighted);
  letter-spacing: -0.02em;
  margin-bottom: 16px;
}

.legal-sub {
  font-size: 16px;
  color: var(--ui-text-muted);
  line-height: 1.65;
  margin-bottom: 56px;
  max-width: 560px;
}

.legal-section {
  margin-bottom: 24px;
}

.legal-section-label {
  font-size: 11px;
  color: var(--color-sage-700);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  margin-bottom: 14px;
  padding-left: 4px;
}

:global(.dark) .legal-section-label {
  color: var(--color-sage-200);
}

.legal-card {
  background: var(--ui-bg-elevated);
  border: 1px solid var(--ui-border);
  border-radius: 16px;
  padding: 28px 32px;
}
.legal-card + .legal-card {
  margin-top: 16px;
}

.legal-card h2 {
  font-family: var(--font-serif);
  font-size: 26px;
  font-weight: 400;
  color: var(--ui-text-highlighted);
  letter-spacing: -0.01em;
  margin-bottom: 14px;
}
.legal-card h3 {
  font-family: var(--font-sans);
  font-size: 13px;
  font-weight: 500;
  color: var(--color-sage-700);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  margin-top: 22px;
  margin-bottom: 10px;
}
:global(.dark) .legal-card h3 {
  color: var(--color-sage-200);
}
.legal-card h3:first-child {
  margin-top: 0;
}
.legal-card p {
  font-size: 15px;
  color: var(--ui-text);
  line-height: 1.7;
  margin-bottom: 12px;
}
.legal-card p:last-child {
  margin-bottom: 0;
}
.legal-card p.muted {
  color: var(--ui-text-muted);
  font-size: 14px;
}
.legal-card a {
  color: var(--color-sage-700);
  text-decoration: underline;
  text-underline-offset: 3px;
  transition: color 0.2s;
}
:global(.dark) .legal-card a {
  color: var(--color-sage-200);
}
.legal-card a:hover {
  color: var(--ui-text-highlighted);
}

.legal-address {
  font-size: 15px !important;
  line-height: 1.85 !important;
  color: var(--ui-text) !important;
}
.legal-address strong {
  color: var(--ui-text-highlighted);
  font-weight: 500;
}

.legal-meta-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
.legal-meta-item {
  background: var(--ui-bg-muted);
  border: 1px solid var(--ui-border-muted);
  border-radius: 10px;
  padding: 14px 16px;
}
.legal-meta-item .lbl {
  font-size: 11px;
  color: var(--ui-text-dimmed);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-bottom: 6px;
}
.legal-meta-item .val {
  font-size: 15px;
  color: var(--ui-text-highlighted);
}

.legal-updated {
  margin-top: 40px;
  text-align: center;
  font-size: 12px;
  color: var(--ui-text-dimmed);
}

@media (max-width: 700px) {
  .legal-card {
    padding: 22px 22px;
  }
  .legal-meta-grid {
    grid-template-columns: 1fr;
  }
}
</style>
