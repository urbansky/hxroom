<script setup lang="ts">
// Die gemeinsame Datenschutzerklärung von HxRoom (doc/legal.md §4): ein Text für alle
// Seiten – hxroom.de, die App für Coachs und die Buchungsseiten –, gegliedert nach
// Personengruppen. Auf einer Buchungsseite setzt die einbindende Seite den Coach als
// Verantwortlichen für Abschnitt 8 ein (`controller`), auf hxroom.de bleibt er allgemein.
//
// Stile aus theme/legal.css. Änderungen am Text: Stand-Datum unten mitziehen.

interface PrivacyController {
  name: string
  /** Anschrift zeilenweise; leer, wenn der Coach nur auf sein Impressum verlinkt. */
  addressLines: string[]
  email: string | null
}

const { controller = null, imprintHref = null, coachPrivacyUrl = null } = defineProps<{
  /** Coach der Buchungsseite; null auf hxroom.de. */
  controller?: PrivacyController | null
  /** Impressum der Buchungsseite, auf das Abschnitt 8 verweist. */
  imprintHref?: string | null
  /** Eigene, zusätzliche Datenschutzerklärung des Coachs. */
  coachPrivacyUrl?: string | null
}>()
</script>

<template>
  <!-- AUF EINEN BLICK -->
  <div class="legal-glance">
    <div class="legal-glance-tile">
      <div class="icon">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2L4 6v6c0 5 3.5 9 8 10 4.5-1 8-5 8-10V6l-8-4z" />
        </svg>
      </div>
      <h4>Datenminimum</h4>
      <p>Ich erhebe nur, was für den Dienst und den sicheren Betrieb nötig ist.</p>
    </div>
    <div class="legal-glance-tile">
      <div class="icon">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
      </div>
      <h4>EU-Hosting</h4>
      <p>Alle Dienste laufen in Rechenzentren in Deutschland oder der EU.</p>
    </div>
    <div class="legal-glance-tile">
      <div class="icon">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="12" width="4" height="8" rx="1" />
          <rect x="10" y="7" width="4" height="13" rx="1" />
          <rect x="17" y="3" width="4" height="17" rx="1" />
        </svg>
      </div>
      <h4>Keine Tracker</h4>
      <p>Auf hxroom.de zähle ich Besuche cookiefrei mit Plausible. In der App und auf den Buchungsseiten findet keine Messung statt.</p>
    </div>
    <div class="legal-glance-tile">
      <div class="icon">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </div>
      <h4>Deine Rechte</h4>
      <p>Auskunft, Löschung, Widerspruch – jederzeit per Mail, beim Newsletter auch per Klick.</p>
    </div>
  </div>

  <!-- FÜR WEN GILT WAS -->
  <section class="legal-section">
    <div class="legal-section-label">Für wen gilt was?</div>
    <div class="legal-card">
      <p>Diese Datenschutzerklärung gilt für alle Seiten von HxRoom: die Website hxroom.de, die App für Coachs unter app.hxroom.de und die Buchungsseiten der Coachs (z. B. anna.hxroom.de).</p>
      <ul class="legal-list">
        <li><strong>Du besuchst hxroom.de</strong> → Abschnitte 1 bis 6 und 9 bis 14. Verantwortlich bin ich.</li>
        <li><strong>Du nutzt HxRoom als Coach</strong> → zusätzlich Abschnitt 7. Verantwortlich bin ich.</li>
        <li><strong>Du buchst über die Buchungsseite eines Coachs</strong> → Abschnitt 8. Verantwortlich ist der Coach, dessen Seite du nutzt. Ich betreibe die Technik in seinem Auftrag.</li>
      </ul>
    </div>
  </section>

  <!-- 1. VERANTWORTLICHER -->
  <section class="legal-section">
    <div class="legal-section-label"><span class="num">1</span> Verantwortlicher &amp; Kontakt</div>
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
      <p class="muted mt-4">Für die Daten, die du bei einer Buchung über die Buchungsseite eines Coachs angibst, ist dieser Coach verantwortlich (Abschnitt 8). Ich verarbeite sie in seinem Auftrag nach Art. 28 DSGVO.</p>
    </div>

    <div class="legal-card">
      <h3>Wenn du mir schreibst</h3>
      <p>Schreibst du mir eine E-Mail, speichere ich deine Adresse, deinen Namen und den Inhalt deiner Nachricht, um dein Anliegen zu beantworten. Die Postfächer von HxRoom liegen bei der IONOS SE, Elgendorfer Straße 57, 56410 Montabaur, Deutschland.</p>

      <div class="legal-meta-grid">
        <div class="legal-meta-item">
          <div class="lbl">Rechtsgrundlage</div>
          <div class="val">Art. 6 Abs. 1 lit. f DSGVO; bei Fragen zu einem Vertrag Art. 6 Abs. 1 lit. b DSGVO</div>
        </div>
        <div class="legal-meta-item">
          <div class="lbl">Speicherdauer</div>
          <div class="val">bis dein Anliegen erledigt ist, länger nur bei gesetzlichen Aufbewahrungspflichten</div>
        </div>
        <div class="legal-meta-item">
          <div class="lbl">Drittlandtransfer</div>
          <div class="val">nein</div>
        </div>
      </div>
    </div>
  </section>

  <!-- 2. HOSTING -->
  <section class="legal-section">
    <div class="legal-section-label"><span class="num">2</span> Hosting</div>
    <div class="legal-card">
      <h2>Hetzner Online GmbH</h2>
      <p class="muted">Alle Seiten von HxRoom – hxroom.de, die App für Coachs und die Buchungsseiten – laufen auf Servern der Hetzner Online GmbH, Industriestraße 25, 91710 Gunzenhausen, Deutschland. Serverstandort: Deutschland. Mit Hetzner besteht ein Vertrag zur Auftragsverarbeitung nach Art. 28 DSGVO.</p>

      <h3>Was in Server-Logs gespeichert wird</h3>
      <ul class="legal-list">
        <li>IP-Adresse</li>
        <li>Datum und Uhrzeit deines Besuchs</li>
        <li>aufgerufene Seite</li>
        <li>User-Agent (Browser, Betriebssystem)</li>
        <li>Referrer (woher du gekommen bist)</li>
      </ul>
      <p>Bei der App und den Buchungsseiten speichert der Webserver nur den Pfad der aufgerufenen Seite, ohne Parameter und ohne Referrer. Zugangslinks aus E-Mails enthalten einen geheimen Schlüssel, der so nie im Log landet.</p>

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
      <p class="muted">Brevo (Sendinblue SAS), Paris, Frankreich. Verarbeitung und Speicherung in der EU. Mit Brevo besteht ein Vertrag zur Auftragsverarbeitung.</p>

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

      <div class="legal-callout">
        <strong>Abmeldung jederzeit.</strong> Jede Newsletter-Mail enthält einen Abmeldelink. Alternativ reicht eine kurze Nachricht an <a href="mailto:kontakt@hxroom.de">kontakt@hxroom.de</a>. Nach der Abmeldung lösche ich deine Daten aus dem aktiven Verteiler. Den Nachweis deiner Einwilligung (Zeitpunkt und IP-Adresse) bewahre ich noch drei Jahre auf, damit ich sie belegen kann, falls sie bestritten wird (Art. 7 Abs. 1 DSGVO, regelmäßige Verjährungsfrist). Danach wird auch er gelöscht.
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
        <li>Standort (Land, Region und Stadt – aus der IP-Adresse abgeleitet, die danach verworfen wird)</li>
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

      <div class="legal-callout">
        <strong>Opt-out möglich.</strong> Da Plausible keine Cookies setzt, gibt es keinen Cookie-Banner. Wer die Messung dennoch unterbinden möchte, kann einen Content-Blocker verwenden, der Anfragen an <em>plausible.io</em> blockiert. Die „Do Not Track"-Einstellung des Browsers wertet Plausible nicht aus.
      </div>
      <p class="muted mt-4">Plausible läuft nur auf hxroom.de. In der App für Coachs und auf den Buchungsseiten findet keine Reichweitenmessung statt.</p>
    </div>
  </section>

  <!-- 5. SCHRIFTARTEN -->
  <section class="legal-section">
    <div class="legal-section-label"><span class="num">5</span> Schriftarten &amp; externe Inhalte</div>
    <div class="legal-card">
      <h3>Lokal eingebunden</h3>
      <p>Die verwendeten Schriftarten liefere ich vom eigenen Server aus. Es findet kein Verbindungsaufbau zu Google Fonts oder ähnlichen Drittanbieter-CDNs statt.</p>
      <p>Auch Symbole und die Bausteine für den Hintergrund-Weichzeichner im Videogespräch liefert HxRoom vom eigenen Server aus. Beim Besuch einer Buchungsseite oder der App gehen keine Anfragen an Dritte.</p>

      <h3>Keine Werbepixel</h3>
      <p>HxRoom setzt keine Werbe-Tracker wie Google Analytics, Facebook Pixel oder LinkedIn Insight Tag ein. Für die datenschutzfreundliche Besucherzählung auf hxroom.de wird ausschließlich Plausible Analytics verwendet (→ Abschnitt 4).</p>
    </div>
  </section>

  <!-- 6. COOKIES -->
  <section class="legal-section">
    <div class="legal-section-label"><span class="num">6</span> Cookies &amp; Speicherung im Browser</div>
    <div class="legal-card">
      <h3>Keine Werbung, keine Analyse</h3>
      <p>HxRoom setzt keine Cookies zu Werbe- oder Analysezwecken.</p>

      <h3>Technisch notwendig</h3>
      <p class="muted">Es können kurzfristig technisch notwendige Cookies zum Einsatz kommen, etwa für den Versand des Newsletter-Formulars.</p>
      <p class="muted"><strong>App für Coachs:</strong> Nach der Anmeldung setzt HxRoom ein Sitzungs-Cookie, damit du angemeldet bleibst. Es ist technisch notwendig und für JavaScript nicht lesbar.</p>
      <p class="muted"><strong>Videogespräch:</strong> Damit du deine Kamera, dein Mikrofon und die Einstellung des Weichzeichners nicht jedes Mal neu wählen musst, merkt sich dein Browser diese Auswahl im lokalen Speicher. Die Angaben verlassen dein Gerät nicht.</p>
      <p class="muted">Eine Einwilligung ist hierfür nach § 25 Abs. 2 Nr. 2 TDDDG nicht erforderlich.</p>
    </div>
  </section>

  <!-- 7. COACHS -->
  <section class="legal-section">
    <div class="legal-section-label"><span class="num">7</span> Coachs: Nutzung von HxRoom</div>
    <div class="legal-card">
      <p>Wenn du HxRoom als Coach nutzt, verarbeite ich die folgenden Daten, um dir den Dienst bereitzustellen.</p>

      <h3>Konto und Anmeldung</h3>
      <ul class="legal-list">
        <li>Name, E-Mail-Adresse, Passwort (nur als verschlüsselter Prüfwert, nie im Klartext)</li>
        <li>je angemeldetem Gerät: Zeitpunkt, IP-Adresse und Browserkennung (User-Agent), damit du deine Sitzungen erkennen und Missbrauch erkannt werden kann. Eine Sitzung läuft nach 7 Tagen ohne Nutzung ab.</li>
      </ul>

      <h3>Deine Inhalte</h3>
      <ul class="legal-list">
        <li>was du für deine Buchungsseite pflegst: Profilfoto, Texte, Schwerpunkte, Qualifikationen, Impressum, Links</li>
        <li>Angebote, Verfügbarkeiten und Einstellungen</li>
        <li>die Daten deiner Klienten, Termine, Notizen und Gesprächsinhalte. Für sie bist du verantwortlich, ich verarbeite sie in deinem Auftrag (siehe Abschnitt 8 und den Auftragsverarbeitungsvertrag).</li>
      </ul>

      <h3>E-Mails</h3>
      <p>Bestätigung deiner Adresse, Zurücksetzen des Passworts, Benachrichtigungen über Buchungen und Absagen, Hinweise zur Löschung deines Kontos. Versand über Brevo (siehe Abschnitt 3).</p>

      <h3>Rückmeldungen</h3>
      <p>Schickst du mir über die App eine Rückmeldung, speichere ich deine Nachricht, die gewählte Kategorie, die Seite, auf der du warst (ohne Parameter), und die Browserkennung.</p>

      <div class="legal-meta-grid">
        <div class="legal-meta-item">
          <div class="lbl">Zweck</div>
          <div class="val">Bereitstellung von HxRoom, Sicherheit des Kontos</div>
        </div>
        <div class="legal-meta-item">
          <div class="lbl">Rechtsgrundlage</div>
          <div class="val">Art. 6 Abs. 1 lit. b DSGVO (Vertrag); für Sitzungsdaten zur Sicherheit Art. 6 Abs. 1 lit. f DSGVO</div>
        </div>
        <div class="legal-meta-item">
          <div class="lbl">Speicherdauer</div>
          <div class="val">solange dein Konto besteht</div>
        </div>
        <div class="legal-meta-item">
          <div class="lbl">Drittlandtransfer</div>
          <div class="val">nein</div>
        </div>
      </div>

      <div class="legal-callout">
        <strong>Konto löschen.</strong> Löschst du dein Konto, wird es nach 30 Tagen endgültig entfernt – samt aller Inhalte und Klientendaten. Bis dahin kannst du die Löschung widerrufen. Aus den Datensicherungen verschwinden die Daten spätestens nach rund vier Monaten (Abschnitt 9).
      </div>
    </div>
  </section>

  <!-- 8. KLIENTEN -->
  <section class="legal-section">
    <div class="legal-section-label"><span class="num">8</span> Klienten: Buchung und Gespräch</div>

    <div class="legal-card">
      <h2>Wer ist verantwortlich?</h2>
      <template v-if="controller">
        <p>Verantwortlich für deine Daten ist der Coach, dessen Buchungsseite du nutzt:</p>
        <p class="legal-address">
          <strong>{{ controller.name }}</strong>
          <template v-for="line in controller.addressLines" :key="line"><br>{{ line }}</template>
          <template v-if="controller.email"><br><a :href="`mailto:${controller.email}`">{{ controller.email }}</a></template>
        </p>
        <p v-if="imprintHref" class="muted">Die vollständigen Angaben stehen im <a :href="imprintHref">Impressum dieser Buchungsseite</a>.</p>
      </template>
      <p v-else>Verantwortlich für deine Daten ist der Coach, dessen Buchungsseite du nutzt. Name und Anschrift stehen im Impressum der jeweiligen Buchungsseite.</p>

      <p>HxRoom stellt dem Coach die Technik bereit – Buchungsseite, E-Mails, Warteraum und Videogespräch – und verarbeitet deine Daten dabei ausschließlich in seinem Auftrag (Art. 28 DSGVO). Für deine Anliegen ist der Coach dein Ansprechpartner (Abschnitt 10).</p>

      <div v-if="coachPrivacyUrl" class="legal-callout">
        Ergänzend gilt die Datenschutzerklärung des Coachs: <a :href="coachPrivacyUrl" target="_blank" rel="noopener noreferrer">{{ coachPrivacyUrl }}</a>
      </div>
    </div>

    <div class="legal-card">
      <h3>Buchung</h3>
      <p>Wenn du einen Termin buchst, gibst du an:</p>
      <ul class="legal-list">
        <li>Name und E-Mail-Adresse (Pflicht)</li>
        <li>Telefonnummer und eine Nachricht an den Coach (freiwillig)</li>
      </ul>
      <p>Dazu speichert HxRoom den gebuchten Termin und das Angebot. Ein Konto brauchst du nicht. Damit der Termin sicher bei dir ankommt, bestätigst du ihn über einen Link in einer E-Mail. Ohne Bestätigung verfällt die Anfrage nach 30 Minuten.</p>

      <h3>Vom Coach eingetragen</h3>
      <p>Der Coach kann dich auch selbst in HxRoom eintragen, etwa für ein spontanes Gespräch. Er gibt dann deinen Namen, deine E-Mail-Adresse und auf Wunsch deine Telefonnummer ein. Bei einem spontanen Gespräch bekommst du eine E-Mail mit dem Link zum Warteraum.</p>

      <h3>E-Mails zum Termin</h3>
      <p>Du bekommst E-Mails zur Bestätigung deines Termins, eine Erinnerung 24 Stunden und eine 1 Stunde vor Beginn sowie eine Nachricht, falls der Termin abgesagt wird. Die Mails enthalten persönliche Links zu Warteraum und Absage. Der Versand läuft über Brevo (Sendinblue SAS, Paris; Verarbeitung in der EU, Vertrag zur Auftragsverarbeitung).</p>

      <h3>Warteraum und Videogespräch</h3>
      <p>Zum Termin öffnest du den Warteraum über deinen persönlichen Link. Der Coach sieht, dass du wartest, und lässt dich herein. Das Gespräch läuft im Browser über einen Videoserver von HxRoom in Deutschland. Bild und Ton werden verschlüsselt übertragen und nur an die Teilnehmenden des Gesprächs weitergeleitet. <strong>Das Gespräch wird nicht aufgezeichnet.</strong></p>
      <p>Dabei verarbeitet der Videoserver deine IP-Adresse und technische Verbindungsdaten, solange das Gespräch läuft. HxRoom speichert, wann du eingelassen wurdest und wann das Gespräch endete.</p>
      <p>Der Hintergrund-Weichzeichner läuft vollständig in deinem Browser. Dein Kamerabild verlässt dafür nicht dein Gerät.</p>

      <h3>Chat und geteilte Dateien</h3>
      <p>Nachrichten und Dateien, die du im Gespräch teilst, speichert HxRoom, damit der Coach sie nach dem Gespräch nachlesen kann. Jede Datei wird vor dem Speichern auf Viren geprüft. Aus Bildern entfernt HxRoom vorher eingebettete Metadaten wie den Aufnahmeort. Gespeichert werden die Dateien in Hetzner Object Storage in Deutschland.</p>

      <h3>Notizen des Coachs</h3>
      <p>Der Coach kann sich während und nach dem Gespräch Notizen machen und eine Anmerkung zu dir hinterlegen. Beides ist nur für ihn sichtbar.</p>

      <div class="legal-meta-grid">
        <div class="legal-meta-item">
          <div class="lbl">Zweck</div>
          <div class="val">Vereinbarung und Durchführung deines Termins mit dem Coach</div>
        </div>
        <div class="legal-meta-item">
          <div class="lbl">Rechtsgrundlage</div>
          <div class="val">Art. 6 Abs. 1 lit. b DSGVO (Vertrag bzw. vorvertragliche Maßnahme mit dem Coach); Erinnerungsmails zusätzlich Art. 6 Abs. 1 lit. f DSGVO</div>
        </div>
        <div class="legal-meta-item">
          <div class="lbl">Speicherdauer</div>
          <div class="val">bis der Coach sie löscht, spätestens mit seinem Konto</div>
        </div>
        <div class="legal-meta-item">
          <div class="lbl">Drittlandtransfer</div>
          <div class="val">nein</div>
        </div>
      </div>

      <h3 class="mt-6">Empfänger</h3>
      <p>Der Coach; als Auftragsverarbeiter HxRoom und dessen Dienstleister Hetzner Online GmbH (Hosting, Speicher, Deutschland) und Brevo (E-Mail-Versand, EU).</p>

      <div class="legal-callout">
        <strong>Löschung.</strong> Der Coach kann dich mit allen Terminen, Notizen, Chatverlauf und geteilten Dateien jederzeit löschen – etwa auf deinen Wunsch. Aus den Datensicherungen verschwinden gelöschte Daten spätestens nach rund vier Monaten (Abschnitt 9).
      </div>
    </div>
  </section>

  <!-- 9. FEHLERÜBERWACHUNG UND DATENSICHERUNG -->
  <section class="legal-section">
    <div class="legal-section-label"><span class="num">9</span> Fehlerüberwachung &amp; Datensicherung</div>
    <div class="legal-card">
      <h3>Fehlerüberwachung</h3>
      <p>Tritt in der App oder auf einer Buchungsseite ein technischer Fehler auf, meldet die Seite ihn an eine Fehlerüberwachung, die ich selbst auf einem eigenen Server bei Hetzner in Deutschland betreibe. Die Meldung enthält die technische Fehlerbeschreibung, die aufgerufene Adresse ohne geheime Schlüssel und die Browserkennung – keine Namen, keine E-Mail-Adressen, keine Inhalte und keine IP-Adresse. Meldungen werden nach 90 Tagen gelöscht.</p>

      <h3>Datensicherung</h3>
      <p>Damit bei einem Ausfall keine Daten verloren gehen, sichere ich Datenbank und Dateien täglich verschlüsselt in einem getrennten Speicher bei Hetzner in Deutschland. Gelöschte Daten bleiben dort noch bis zu rund vier Monaten (Datenbank) bzw. 60 Tagen (Dateien) erhalten und werden dann automatisch entfernt.</p>

      <div class="legal-meta-grid">
        <div class="legal-meta-item">
          <div class="lbl">Zweck</div>
          <div class="val">Stabilität und Sicherheit des Dienstes</div>
        </div>
        <div class="legal-meta-item">
          <div class="lbl">Rechtsgrundlage</div>
          <div class="val">Art. 6 Abs. 1 lit. f DSGVO; bei Klientendaten im Auftrag des Coachs (Art. 28 DSGVO)</div>
        </div>
        <div class="legal-meta-item">
          <div class="lbl">Drittlandtransfer</div>
          <div class="val">nein</div>
        </div>
      </div>
    </div>
  </section>

  <!-- 10. RECHTE -->
  <section class="legal-section">
    <div class="legal-section-label"><span class="num">10</span> Deine Rechte</div>
    <div class="legal-card">
      <div class="legal-rights-grid">
        <div class="legal-rights-block">
          <h4>Auskunft &amp; Berichtigung</h4>
          <ul>
            <li>Auskunft (Art. 15 DSGVO)</li>
            <li>Berichtigung (Art. 16 DSGVO)</li>
          </ul>
        </div>
        <div class="legal-rights-block">
          <h4>Löschung &amp; Einschränkung</h4>
          <ul>
            <li>Löschung (Art. 17 DSGVO)</li>
            <li>Einschränkung (Art. 18 DSGVO)</li>
          </ul>
        </div>
        <div class="legal-rights-block">
          <h4>Widerspruch &amp; Widerruf</h4>
          <ul>
            <li>Widerspruch (Art. 21 DSGVO)</li>
            <li>Widerruf (Art. 7 Abs. 3 DSGVO)</li>
          </ul>
        </div>
        <div class="legal-rights-block">
          <h4>Übertragbarkeit</h4>
          <ul>
            <li>Datenübertragbarkeit (Art. 20 DSGVO)</li>
          </ul>
        </div>
      </div>

      <div class="legal-callout">
        <strong>Widerspruchsrecht nach Art. 21 DSGVO.</strong> Verarbeite ich deine Daten auf Grundlage berechtigter Interessen (Art. 6 Abs. 1 lit. f DSGVO), kannst du dem jederzeit widersprechen, wenn sich dafür Gründe aus deiner besonderen Situation ergeben. Ich verarbeite die Daten dann nicht mehr, es sei denn, ich kann zwingende schutzwürdige Gründe nachweisen, die deine Interessen überwiegen, oder die Verarbeitung dient der Geltendmachung, Ausübung oder Verteidigung von Rechtsansprüchen.
      </div>
      <div class="legal-callout">
        Für alle Anliegen genügt eine formlose Nachricht an <a href="mailto:kontakt@hxroom.de">kontakt@hxroom.de</a>.
      </div>
      <div class="legal-callout">
        <strong>Wenn du über die Buchungsseite eines Coachs gebucht hast,</strong> wende dich mit deinen Anliegen an den Coach – er ist für deine Daten verantwortlich. Schreibst du mir, leite ich deine Anfrage an ihn weiter und unterstütze ihn bei der Umsetzung.
      </div>
    </div>
  </section>

  <!-- 11. BESCHWERDERECHT -->
  <section class="legal-section">
    <div class="legal-section-label"><span class="num">11</span> Beschwerderecht</div>
    <div class="legal-card">
      <p>Du hast das Recht, dich bei einer Datenschutz-Aufsichtsbehörde zu beschweren. Zuständig für mich ist:</p>
      <p class="legal-address">
        <strong>Die Sächsische Datenschutz- und Transparenzbeauftragte</strong><br>
        Maternistraße 17<br>
        01067 Dresden
      </p>
      <div class="legal-meta-grid">
        <div class="legal-meta-item">
          <div class="lbl">E-Mail</div>
          <div class="val"><a href="mailto:post@sdtb.sachsen.de">post@sdtb.sachsen.de</a></div>
        </div>
        <div class="legal-meta-item">
          <div class="lbl">Web</div>
          <div class="val"><a href="https://www.datenschutz.sachsen.de" target="_blank" rel="noopener">www.datenschutz.sachsen.de</a></div>
        </div>
      </div>
    </div>
  </section>

  <!-- 12. DRITTLAND -->
  <section class="legal-section">
    <div class="legal-section-label"><span class="num">12</span> Drittlandsübermittlung</div>
    <div class="legal-card">
      <p>Eine Übermittlung deiner personenbezogenen Daten in Länder außerhalb der EU oder des EWR findet <strong>nicht</strong> statt.</p>
    </div>
  </section>

  <!-- 13. AUTOMATISIERTE ENTSCHEIDUNG -->
  <section class="legal-section">
    <div class="legal-section-label"><span class="num">13</span> Keine automatisierte Entscheidung</div>
    <div class="legal-card">
      <p>Eine automatisierte Entscheidungsfindung einschließlich Profiling im Sinne des Art. 22 DSGVO findet <strong>nicht</strong> statt.</p>
    </div>
  </section>

  <!-- 14. ÄNDERUNGEN -->
  <section class="legal-section">
    <div class="legal-section-label"><span class="num">14</span> Änderungen</div>
    <div class="legal-card">
      <p>Ich passe diese Datenschutzerklärung an, wenn sich die Verarbeitung oder die Rechtslage ändert. Es gilt jeweils die auf hxroom.de veröffentlichte Fassung.</p>
    </div>
  </section>

  <p class="legal-updated">Stand: 27. Oktober 2026</p>
</template>
