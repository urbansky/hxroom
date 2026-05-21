<script setup lang="ts">
definePageMeta({ layout: 'legal' })

useHead({
  title: 'Datenschutz · HxRoom',
  meta: [
    { name: 'description', content: 'Datenschutzerklärung der HxRoom-Landingpage – Datenminimum, EU-Hosting, cookiefreie Analyse.' },
    { name: 'robots', content: 'noindex, follow' },
  ],
})
</script>

<template>
  <div class="legal-container">
    <span class="legal-eyebrow">Rechtliches</span>
    <h1 class="legal-headline">Datenschutz&shy;erklärung</h1>
    <p class="legal-sub">Deine Daten – kurz und klar erklärt. So wenig wie möglich, alles in der EU, kein Cookie-Tracking.</p>

    <!-- AUF EINEN BLICK -->
    <div class="glance">
      <div class="glance-tile">
        <div class="icon">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2L4 6v6c0 5 3.5 9 8 10 4.5-1 8-5 8-10V6l-8-4z" />
          </svg>
        </div>
        <h4>Datenminimum</h4>
        <p>Ich erhebe nur, was ich für den Newsletter und den sicheren Betrieb brauche.</p>
      </div>
      <div class="glance-tile">
        <div class="icon">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
        </div>
        <h4>EU-Hosting</h4>
        <p>Alle Dienste laufen in Rechenzentren in Deutschland oder der EU.</p>
      </div>
      <div class="glance-tile">
        <div class="icon">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="12" width="4" height="8" rx="1" />
            <rect x="10" y="7" width="4" height="13" rx="1" />
            <rect x="17" y="3" width="4" height="17" rx="1" />
          </svg>
        </div>
        <h4>Cookie-freie Analyse</h4>
        <p>Ich nutze Plausible Analytics – cookiefrei, kein Fingerprinting, keine Profilbildung, kein Consent-Banner nötig.</p>
      </div>
      <div class="glance-tile">
        <div class="icon">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <h4>Deine Rechte</h4>
        <p>Auskunft, Löschung, Newsletter-Abmeldung – alles jederzeit per Klick oder Mail.</p>
      </div>
    </div>

    <!-- 1. VERANTWORTLICHER -->
    <section class="legal-section">
      <div class="legal-section-label"><span class="num">1</span> Verantwortlicher</div>
      <div class="legal-card">
        <p class="legal-address">
          <strong>Dr.-Ing. Stefan Urbansky</strong><br>
          Dresdner Landstraße 30e<br>
          01728 Bannewitz
        </p>
        <div class="legal-meta-grid">
          <div class="legal-meta-item">
            <div class="lbl">E-Mail</div>
            <div class="val"><a href="mailto:kontakt@hxroom.de">kontakt@hxroom.de</a></div>
          </div>
        </div>
      </div>
    </section>

    <!-- 2. HOSTING -->
    <section class="legal-section">
      <div class="legal-section-label"><span class="num">2</span> Hosting der Webseite</div>
      <div class="legal-card">
        <h2>Hetzner Online GmbH</h2>
        <p class="muted">Industriestraße 25, 91710 Gunzenhausen, Deutschland. Serverstandort: Deutschland. Mit Hetzner besteht ein Vertrag zur Auftragsverarbeitung nach Art. 28 DSGVO.</p>

        <h3>Was in Server-Logs gespeichert wird</h3>
        <ul class="legal-list">
          <li>IP-Adresse</li>
          <li>Datum und Uhrzeit deines Besuchs</li>
          <li>aufgerufene Seite</li>
          <li>User-Agent (Browser, Betriebssystem)</li>
          <li>Referrer (woher du gekommen bist)</li>
        </ul>

        <div class="legal-meta-grid">
          <div class="legal-meta-item">
            <div class="lbl">Zweck</div>
            <div class="val">Sicherheit &amp; Stabilität</div>
          </div>
          <div class="legal-meta-item">
            <div class="lbl">Rechtsgrundlage</div>
            <div class="val">Art. 6 Abs. 1 lit. f DSGVO</div>
          </div>
          <div class="legal-meta-item">
            <div class="lbl">Speicherdauer</div>
            <div class="val">max. 14 Tage</div>
          </div>
          <div class="legal-meta-item">
            <div class="lbl">Drittlandtransfer</div>
            <div class="val">nein</div>
          </div>
        </div>
      </div>
    </section>

    <!-- 3. NEWSLETTER -->
    <section class="legal-section">
      <div class="legal-section-label"><span class="num">3</span> Newsletter-Anmeldung</div>

      <div class="legal-card">
        <h2>Was ich erhebe</h2>
        <ul class="legal-list">
          <li>Vorname / Name – für die persönliche Ansprache</li>
          <li>E-Mail-Adresse – für den Versand</li>
          <li>Zeitpunkt der Anmeldung und der Bestätigung</li>
          <li>IP-Adresse zum Zeitpunkt der Anmeldung – Nachweis der Einwilligung</li>
        </ul>
      </div>

      <div class="legal-card">
        <h2>Versanddienstleister: Brevo</h2>
        <p class="muted">Sendinblue SAS (Marke „Brevo"), 106 Boulevard Haussmann, 75008 Paris, Frankreich. Verarbeitung und Speicherung in der EU. Mit Brevo besteht ein Vertrag zur Auftragsverarbeitung.</p>

        <h3>Double-Opt-In</h3>
        <p>Nach deiner Eintragung bekommst du eine Bestätigungsmail. Erst nach Klick auf den Link darin trage ich dich in den Verteiler ein.</p>

        <h3>Erfolgsmessung</h3>
        <p>Die Newsletter-Mails enthalten einen Zählpixel und nachverfolgbare Links. Damit sehe ich, ob und wann du eine E-Mail geöffnet hast und auf welche Links du geklickt hast. Diese Daten nutze ich ausschließlich, um den Newsletter zu verbessern – nicht für Profilbildung oder Werbung Dritter.</p>

        <div class="legal-meta-grid">
          <div class="legal-meta-item">
            <div class="lbl">Rechtsgrundlage</div>
            <div class="val">Art. 6 Abs. 1 lit. a DSGVO · § 7 UWG</div>
          </div>
          <div class="legal-meta-item">
            <div class="lbl">Drittlandtransfer</div>
            <div class="val">nein</div>
          </div>
        </div>

        <div class="callout">
          <strong>Abmeldung jederzeit.</strong> Jede Newsletter-Mail enthält einen Abmeldelink. Alternativ reicht eine kurze Nachricht an <a href="mailto:kontakt@hxroom.de">kontakt@hxroom.de</a>. Nach der Abmeldung lösche ich deine Daten aus dem aktiven Verteiler. Einwilligungsnachweise bewahre ich noch drei Jahre auf (gesetzliche Pflicht), danach werden auch sie gelöscht.
        </div>
      </div>
    </section>

    <!-- 4. WEB-ANALYTICS -->
    <section class="legal-section">
      <div class="legal-section-label"><span class="num">4</span> Web-Analytics (Plausible)</div>
      <div class="legal-card">
        <h2>Plausible Analytics</h2>
        <p class="muted">Plausible Insights OÜ, Västriku tn 2, 50403 Tartu, Estland (EU). Mit Plausible Insights OÜ besteht ein Vertrag zur Auftragsverarbeitung nach Art. 28 DSGVO.</p>

        <h3>Was Plausible erfasst</h3>
        <ul class="legal-list">
          <li>Aufgerufene Seite und Referrer (ohne Query-Parameter)</li>
          <li>Standort (Land und Region – nicht genauer)</li>
          <li>Gerätekategorie, Betriebssystem, Browser</li>
          <li>Aggregierte Seitenaufrufe und Sitzungsdauer</li>
        </ul>

        <h3>Was Plausible ausdrücklich NICHT erfasst</h3>
        <ul class="legal-list">
          <li>IP-Adresse (wird serverseitig sofort verworfen, nicht gespeichert)</li>
          <li>Cookies oder persistente Gerätekennzeichner</li>
          <li>Personenbezogene Daten im Sinne der DSGVO</li>
        </ul>

        <div class="legal-meta-grid">
          <div class="legal-meta-item">
            <div class="lbl">Zweck</div>
            <div class="val">Webseitenoptimierung &amp; Reichweitenmessung</div>
          </div>
          <div class="legal-meta-item">
            <div class="lbl">Rechtsgrundlage</div>
            <div class="val">Art. 6 Abs. 1 lit. f DSGVO</div>
          </div>
          <div class="legal-meta-item">
            <div class="lbl">Drittlandtransfer</div>
            <div class="val">nein (EU-Server)</div>
          </div>
          <div class="legal-meta-item">
            <div class="lbl">Datenschutz Plausible</div>
            <div class="val"><a href="https://plausible.io/privacy" target="_blank" rel="noopener">plausible.io/privacy</a></div>
          </div>
        </div>

        <div class="callout">
          <strong>Opt-out möglich.</strong> Da Plausible keine Cookies setzt, gibt es keinen Cookie-Banner. Wer die Messung dennoch unterbinden möchte, kann einen Content-Blocker verwenden, der Anfragen an <em>plausible.io</em> blockiert, oder die „Do Not Track"-Einstellung im Browser aktivieren – Plausible respektiert dieses Signal.
        </div>
      </div>
    </section>

    <!-- 5. SCHRIFTARTEN -->
    <section class="legal-section">
      <div class="legal-section-label"><span class="num">5</span> Schriftarten &amp; externe Inhalte</div>
      <div class="legal-card">
        <h3>Lokal eingebunden</h3>
        <p>Die verwendeten Schriftarten liefere ich vom eigenen Server aus. Es findet kein Verbindungsaufbau zu Google Fonts oder ähnlichen Drittanbieter-CDNs statt.</p>

        <h3>Keine Werbepixel</h3>
        <p>Diese Seite setzt keine Werbe-Tracker wie Google Analytics, Facebook Pixel oder LinkedIn Insight Tag ein. Für die datenschutzfreundliche Besucherzählung wird ausschließlich Plausible Analytics verwendet (→ Abschnitt 4).</p>
      </div>
    </section>

    <!-- 6. COOKIES -->
    <section class="legal-section">
      <div class="legal-section-label"><span class="num">6</span> Cookies</div>
      <div class="legal-card">
        <h3>Keine Werbung, keine Analyse</h3>
        <p>Diese Seite setzt keine Cookies zu Werbe- oder Analysezwecken.</p>

        <h3>Technisch notwendig</h3>
        <p class="muted">Es können kurzfristig technisch notwendige Cookies zum Einsatz kommen, etwa für den Versand des Newsletter-Formulars. Eine Einwilligung hierfür ist nach § 25 Abs. 2 Nr. 2 TDDDG nicht erforderlich.</p>
      </div>
    </section>

    <!-- 7. RECHTE -->
    <section class="legal-section">
      <div class="legal-section-label"><span class="num">7</span> Deine Rechte</div>
      <div class="legal-card">
        <div class="rights-grid">
          <div class="rights-block">
            <h4>Auskunft &amp; Berichtigung</h4>
            <ul>
              <li>Auskunft (Art. 15 DSGVO)</li>
              <li>Berichtigung (Art. 16 DSGVO)</li>
            </ul>
          </div>
          <div class="rights-block">
            <h4>Löschung &amp; Einschränkung</h4>
            <ul>
              <li>Löschung (Art. 17 DSGVO)</li>
              <li>Einschränkung (Art. 18 DSGVO)</li>
            </ul>
          </div>
          <div class="rights-block">
            <h4>Widerspruch &amp; Widerruf</h4>
            <ul>
              <li>Widerspruch (Art. 21 DSGVO)</li>
              <li>Widerruf (Art. 7 Abs. 3 DSGVO)</li>
            </ul>
          </div>
          <div class="rights-block">
            <h4>Übertragbarkeit</h4>
            <ul>
              <li>Datenübertragbarkeit (Art. 20 DSGVO)</li>
            </ul>
          </div>
        </div>

        <div class="callout">
          Für alle Anliegen genügt eine formlose Nachricht an <a href="mailto:kontakt@hxroom.de">kontakt@hxroom.de</a>.
        </div>
      </div>
    </section>

    <!-- 8. BESCHWERDERECHT -->
    <section class="legal-section">
      <div class="legal-section-label"><span class="num">8</span> Beschwerderecht</div>
      <div class="legal-card">
        <p>Du hast das Recht, dich bei einer Datenschutz-Aufsichtsbehörde zu beschweren. Zuständig für mich ist:</p>
        <p class="legal-address">
          <strong>Sächsischer Datenschutzbeauftragter</strong><br>
          Devrientstraße 5<br>
          01067 Dresden
        </p>
        <div class="legal-meta-grid">
          <div class="legal-meta-item">
            <div class="lbl">E-Mail</div>
            <div class="val"><a href="mailto:saechsdsb@slt.sachsen.de">saechsdsb@slt.sachsen.de</a></div>
          </div>
          <div class="legal-meta-item">
            <div class="lbl">Web</div>
            <div class="val"><a href="https://www.saechsdsb.de" target="_blank" rel="noopener">www.saechsdsb.de</a></div>
          </div>
        </div>
      </div>
    </section>

    <!-- 9. DRITTLAND -->
    <section class="legal-section">
      <div class="legal-section-label"><span class="num">9</span> Drittlandsübermittlung</div>
      <div class="legal-card">
        <p>Eine Übermittlung deiner personenbezogenen Daten in Länder außerhalb der EU oder des EWR findet <strong>nicht</strong> statt.</p>
      </div>
    </section>

    <!-- 10. AUTOMATISIERTE ENTSCHEIDUNG -->
    <section class="legal-section">
      <div class="legal-section-label"><span class="num">10</span> Keine automatisierte Entscheidung</div>
      <div class="legal-card">
        <p>Eine automatisierte Entscheidungsfindung einschließlich Profiling im Sinne des Art. 22 DSGVO findet <strong>nicht</strong> statt.</p>
      </div>
    </section>

    <!-- 11. ÄNDERUNGEN -->
    <section class="legal-section">
      <div class="legal-section-label"><span class="num">11</span> Änderungen</div>
      <div class="legal-card">
        <p>Ich passe diese Datenschutzerklärung an, wenn sich die Verarbeitung oder die Rechtslage ändert. Es gilt jeweils die auf hxroom.de veröffentlichte Fassung.</p>
      </div>
    </section>

    <p class="legal-updated">Stand: 21. Mai 2026</p>
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

/* "Auf einen Blick"-Kachelraster */
.glance {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
  margin-bottom: 48px;
}
.glance-tile {
  background: var(--ui-bg-elevated);
  border: 1px solid var(--ui-border);
  border-radius: 14px;
  padding: 20px 22px;
}
.glance-tile .icon {
  width: 32px;
  height: 32px;
  border-radius: 9px;
  background: color-mix(in srgb, var(--color-sage-400) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-sage-400) 22%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 14px;
}
.glance-tile .icon svg {
  width: 16px;
  height: 16px;
  stroke: var(--color-sage-700);
  fill: none;
}
:global(.dark) .glance-tile .icon svg {
  stroke: var(--color-sage-200);
}
.glance-tile h4 {
  font-family: var(--font-sans);
  font-size: 14px;
  font-weight: 500;
  color: var(--ui-text-highlighted);
  margin-bottom: 6px;
  letter-spacing: 0.01em;
}
.glance-tile p {
  font-size: 13px;
  line-height: 1.55;
  color: var(--ui-text-muted);
}

/* Section + label */
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
  display: flex;
  align-items: center;
  gap: 10px;
}
:global(.dark) .legal-section-label {
  color: var(--color-sage-200);
}
.legal-section-label .num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--color-gold-400) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-gold-400) 25%, transparent);
  color: var(--color-gold-500);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0;
}
:global(.dark) .legal-section-label .num {
  color: var(--color-gold-300);
}

/* Card */
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
  font-size: 12px;
  font-weight: 500;
  color: var(--color-sage-700);
  letter-spacing: 0.08em;
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
.legal-card strong {
  color: var(--ui-text-highlighted);
  font-weight: 500;
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

.legal-list {
  list-style: none;
  padding: 0;
  margin: 0 0 12px;
}
.legal-list li {
  position: relative;
  padding: 6px 0 6px 20px;
  font-size: 14.5px;
  line-height: 1.6;
  color: var(--ui-text);
}
.legal-list li::before {
  content: '';
  position: absolute;
  left: 4px;
  top: 16px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--color-sage-500);
  opacity: 0.8;
}

.legal-address {
  font-size: 15px !important;
  line-height: 1.85 !important;
  color: var(--ui-text) !important;
}

.legal-meta-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-top: 14px;
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
  font-size: 14px;
  color: var(--ui-text-highlighted);
}

.rights-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
.rights-block {
  background: var(--ui-bg-muted);
  border: 1px solid var(--ui-border-muted);
  border-radius: 12px;
  padding: 18px 20px;
}
.rights-block h4 {
  font-family: var(--font-sans);
  font-size: 12px;
  font-weight: 500;
  color: var(--color-sage-700);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 12px;
}
:global(.dark) .rights-block h4 {
  color: var(--color-sage-200);
}
.rights-block ul {
  list-style: none;
  padding: 0;
}
.rights-block li {
  font-size: 14px;
  line-height: 1.55;
  color: var(--ui-text);
  padding: 4px 0;
}

.callout {
  background: color-mix(in srgb, var(--color-gold-400) 5%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-gold-400) 18%, transparent);
  border-radius: 12px;
  padding: 16px 18px;
  margin-top: 14px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--ui-text-muted);
}
.callout strong {
  color: var(--color-gold-500);
}
:global(.dark) .callout strong {
  color: var(--color-gold-300);
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
  .glance,
  .legal-meta-grid,
  .rights-grid {
    grid-template-columns: 1fr;
  }
}
</style>
