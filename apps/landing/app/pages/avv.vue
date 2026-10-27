<script setup lang="ts">
definePageMeta({ layout: 'legal' })

useHead({
  title: 'AVV · HxRoom',
  meta: [
    { name: 'description', content: 'Vertrag zur Auftragsverarbeitung nach Art. 28 DSGVO zwischen HxRoom und den Coachs – mit Unterauftragsverarbeitern und technischen Maßnahmen.' },
    { name: 'robots', content: 'noindex, follow' },
  ],
})
</script>

<template>
  <!-- Vertrag zur Auftragsverarbeitung (doc/legal.md §6), Bestandteil der AGB. Die Liste der
       Unterauftragsverarbeiter folgt legal.md §4.4, die Maßnahmen technisches-konzept.md §13
       und §17 – beide hier nachziehen, wenn sich dort etwas ändert. Stile aus legal.css.
       Neuer Text: Stand-Datum unten und TERMS_VERSION in packages/shared/src/terms.ts mitziehen. -->
  <div class="legal-container">
    <span class="legal-eyebrow">Rechtliches</span>
    <h1 class="legal-headline">Auftrags&shy;verarbeitung</h1>
    <p class="legal-sub">Vertrag nach Art. 28 DSGVO über die Daten deiner Klienten, die HxRoom in deinem Auftrag verarbeitet.</p>

    <!-- 1. PARTEIEN -->
    <section class="legal-section">
      <div class="legal-section-label"><span class="num">1</span> Vertragsparteien und Rollen</div>
      <div class="legal-card">
        <p>Dieser Vertrag gilt zwischen dir als Coach (<strong>Verantwortlicher</strong>) und mir als Anbieter von HxRoom (<strong>Auftragsverarbeiter</strong>):</p>
        <p class="legal-address">
          <strong>Dr.-Ing. Stefan Urbansky</strong><br>
          Dresdner Landstraße 30e<br>
          01728 Bannewitz<br>
          <a href="mailto:kontakt@hxroom.de">kontakt@hxroom.de</a>
        </p>
        <p>Er ist Bestandteil der <NuxtLink to="/agb">Allgemeinen Geschäftsbedingungen</NuxtLink> und wird mit ihnen bei der Registrierung abgeschlossen. Er läuft so lange wie der Vertrag über die Nutzung von HxRoom. Bei Widersprüchen geht dieser Vertrag den AGB vor, soweit es um den Schutz personenbezogener Daten geht.</p>
        <p>Für die Daten deines eigenen Kontos bin ich selbst verantwortlich. Sie fallen nicht unter diesen Vertrag, sondern unter die <NuxtLink to="/datenschutz">Datenschutzerklärung</NuxtLink>.</p>
      </div>
    </section>

    <!-- 2. GEGENSTAND -->
    <section class="legal-section">
      <div class="legal-section-label"><span class="num">2</span> Gegenstand der Verarbeitung</div>

      <div class="legal-card">
        <h3>Art und Zweck</h3>
        <p>Ich stelle dir HxRoom bereit: Buchungsseite, Terminbuchung, E-Mails an deine Klienten, Warteraum, Videogespräch mit Chat und geteilten Dateien, Notizen und die Verwaltung deiner Klienten. Dafür speichere, übermittle und lösche ich Daten deiner Klienten. Ich verarbeite sie ausschließlich, um HxRoom für dich zu betreiben, und nicht für eigene Zwecke.</p>
      </div>

      <div class="legal-card">
        <h3>Betroffene Personen</h3>
        <ul class="legal-list">
          <li>deine Klienten</li>
          <li>Interessenten, die über deine Buchungsseite einen Termin anfragen</li>
          <li>weitere Personen, soweit du oder deine Klienten in Notizen, Chat oder Dateien Angaben über sie machen</li>
        </ul>
      </div>

      <div class="legal-card">
        <h3>Art der Daten</h3>
        <ul class="legal-list">
          <li>Name, E-Mail-Adresse, auf Wunsch Telefonnummer</li>
          <li>Termine, gebuchte Angebote, Nachrichten zur Buchung, Zeitpunkte von Einlass und Gesprächsende</li>
          <li>deine Notizen und Anmerkungen zu Klienten</li>
          <li>Chatnachrichten und geteilte Dateien aus dem Gespräch</li>
          <li>während des Gesprächs: Bild und Ton sowie IP-Adresse und technische Verbindungsdaten. Bild und Ton werden nur weitergeleitet, nicht gespeichert.</li>
        </ul>
        <p>Notizen, Chat und Dateien können <strong>besondere Kategorien</strong> personenbezogener Daten nach Art. 9 DSGVO enthalten, etwa Angaben zur Gesundheit, wenn du oder deine Klienten sie dort festhalten. Ob und auf welcher Grundlage das zulässig ist, verantwortest du.</p>
      </div>
    </section>

    <!-- 3. WEISUNGEN -->
    <section class="legal-section">
      <div class="legal-section-label"><span class="num">3</span> Weisungen</div>
      <div class="legal-card">
        <p>Ich verarbeite die Daten nur auf deine dokumentierte Weisung. Deine Weisungen sind dieser Vertrag und alles, was du in HxRoom einstellst und auslöst – etwa einen Klienten anlegen, einen Termin absagen, Daten exportieren oder löschen. Weitere Weisungen erteilst du in Textform, etwa per E-Mail.</p>
        <p>Halte ich eine Weisung für rechtswidrig, sage ich dir das unverzüglich. Ich darf sie dann aussetzen, bis du sie bestätigt oder geändert hast.</p>
        <p>Muss ich Daten aufgrund einer gesetzlichen Pflicht anders verarbeiten, teile ich dir das vorher mit, sofern das Gesetz es nicht verbietet.</p>
      </div>
    </section>

    <!-- 4. VERTRAULICHKEIT -->
    <section class="legal-section">
      <div class="legal-section-label"><span class="num">4</span> Vertraulichkeit und Zugriff</div>
      <div class="legal-card">
        <p>Ich behandle die Daten vertraulich. Setze ich weitere Personen ein, die Zugang zu den Daten haben, verpflichte ich sie vorher zur Vertraulichkeit.</p>
        <p>Auf Daten deiner Klienten greife ich nur zu, soweit das für den Betrieb, die Datensicherung oder die Behebung von Fehlern nötig ist oder du mich darum bittest, etwa bei einer Support-Anfrage. Dein Konto übernehme ich nur mit deiner Zustimmung.</p>
      </div>
    </section>

    <!-- 5. SICHERHEIT -->
    <section class="legal-section">
      <div class="legal-section-label"><span class="num">5</span> Sicherheit der Verarbeitung</div>
      <div class="legal-card">
        <p>Ich treffe die technischen und organisatorischen Maßnahmen nach Art. 32 DSGVO, die in <a href="#anlage-2">Anlage 2</a> beschrieben sind. Ich darf sie weiterentwickeln, solange das Schutzniveau nicht sinkt.</p>
      </div>
    </section>

    <!-- 6. UNTERAUFTRAG -->
    <section class="legal-section">
      <div class="legal-section-label"><span class="num">6</span> Unterauftragsverarbeiter</div>
      <div class="legal-card">
        <p>Du genehmigst die in <a href="#anlage-1">Anlage 1</a> genannten Unterauftragsverarbeiter. Mit jedem habe ich einen Vertrag geschlossen, der ihm dieselben Datenschutzpflichten auferlegt wie mir dieser Vertrag.</p>
        <p>Will ich einen Unterauftragsverarbeiter hinzunehmen oder ersetzen, teile ich dir das mindestens vier Wochen vorher per E-Mail mit. Du kannst innerhalb dieser Frist aus wichtigem datenschutzrechtlichem Grund widersprechen. Können wir uns nicht einigen, kannst du den Vertrag zum Wirksamwerden der Änderung kündigen.</p>
        <p>Eine Verarbeitung außerhalb der EU oder des EWR findet nicht statt. Daran ändere ich nichts ohne deine vorherige Zustimmung.</p>
      </div>
    </section>

    <!-- 7. UNTERSTÜTZUNG -->
    <section class="legal-section">
      <div class="legal-section-label"><span class="num">7</span> Unterstützung</div>

      <div class="legal-card">
        <h3>Rechte deiner Klienten</h3>
        <p>Auskunft, Berichtigung, Löschung und Datenübertragbarkeit kannst du in HxRoom selbst erledigen: Klienten bearbeiten und löschen, Daten exportieren. Wo das nicht reicht, unterstütze ich dich. Wendet sich ein Klient direkt an mich, leite ich die Anfrage unverzüglich an dich weiter und beantworte sie nicht selbst.</p>
      </div>

      <div class="legal-card">
        <h3>Datenschutzverletzungen</h3>
        <p>Bemerke ich eine Verletzung des Schutzes der Daten deiner Klienten, informiere ich dich unverzüglich per E-Mail. Ich beschreibe, was passiert ist, welche Daten und Personen betroffen sind und was ich dagegen unternehme, damit du deine Meldepflichten nach Art. 33 und 34 DSGVO erfüllen kannst.</p>
      </div>

      <div class="legal-card">
        <h3>Weitere Pflichten</h3>
        <p>Bei einer Datenschutz-Folgenabschätzung und bei Fragen der Aufsichtsbehörde unterstütze ich dich mit den Informationen, die mir vorliegen.</p>
      </div>
    </section>

    <!-- 8. ENDE -->
    <section class="legal-section">
      <div class="legal-section-label"><span class="num">8</span> Löschung nach Vertragsende</div>
      <div class="legal-card">
        <p>Vor dem Ende des Vertrags kannst du alle Daten deiner Klienten exportieren. Nach dem Ende bleiben sie noch 30 Tage erhalten, damit du eine Löschung widerrufen kannst. Danach lösche ich sie vollständig, sofern keine gesetzliche Pflicht zur Aufbewahrung besteht.</p>
        <p>In den Datensicherungen bleiben gelöschte Daten noch bis zu rund vier Monate (Datenbank) bzw. 60 Tage (Dateien) erhalten. Sie sind dort verschlüsselt, werden nicht weiter verwendet und verschwinden dann automatisch.</p>
      </div>
    </section>

    <!-- 9. NACHWEISE -->
    <section class="legal-section">
      <div class="legal-section-label"><span class="num">9</span> Nachweise und Kontrollen</div>
      <div class="legal-card">
        <p>Auf Anfrage stelle ich dir die Informationen zur Verfügung, die du brauchst, um die Einhaltung dieses Vertrags zu prüfen. Darüber hinaus kannst du Kontrollen durchführen oder von einem zur Verschwiegenheit verpflichteten Prüfer durchführen lassen – nach rechtzeitiger Ankündigung, zu üblichen Geschäftszeiten und ohne den Betrieb für andere Coachs zu stören.</p>
      </div>
    </section>

    <!-- 10. SCHLUSS -->
    <section class="legal-section">
      <div class="legal-section-label"><span class="num">10</span> Haftung und Schlussbestimmungen</div>
      <div class="legal-card">
        <p>Für die Haftung gilt Art. 82 DSGVO. Im Übrigen gelten die Regeln der AGB.</p>
        <p>Änderungen dieses Vertrags teile ich dir mit wie Änderungen der AGB. Ist eine Bestimmung unwirksam, bleibt der Vertrag im Übrigen wirksam.</p>
      </div>
    </section>

    <!-- ANLAGE 1 -->
    <section id="anlage-1" class="legal-section">
      <div class="legal-section-label">Anlage 1 · Unterauftragsverarbeiter</div>

      <div class="legal-card">
        <h2>Hetzner Online GmbH</h2>
        <p class="muted">Industriestraße 25, 91710 Gunzenhausen, Deutschland</p>
        <p>Server für Anwendung, Datenbank, Videogespräche, Virenprüfung und Fehlerüberwachung, Speicher für Dateien, Datensicherungen.</p>
        <div class="legal-meta-grid">
          <div class="legal-meta-item">
            <div class="lbl">Standort</div>
            <div class="val">Deutschland (Falkenstein, Nürnberg)</div>
          </div>
        </div>
      </div>

      <div class="legal-card">
        <h2>Brevo (Sendinblue SAS)</h2>
        <p class="muted">Paris, Frankreich</p>
        <p>Versand der E-Mails an deine Klienten: Bestätigungen, Erinnerungen, Einladungen und Absagen.</p>
        <div class="legal-meta-grid">
          <div class="legal-meta-item">
            <div class="lbl">Standort</div>
            <div class="val">EU</div>
          </div>
        </div>
      </div>

      <div class="legal-card">
        <p class="muted">Videoserver (LiveKit), Virenprüfung (ClamAV) und Fehlerüberwachung (GlitchTip) betreibe ich selbst auf diesen Servern. Sie sind keine weiteren Unterauftragsverarbeiter.</p>
      </div>
    </section>

    <!-- ANLAGE 2 -->
    <section id="anlage-2" class="legal-section">
      <div class="legal-section-label">Anlage 2 · Technische und organisatorische Maßnahmen</div>

      <div class="legal-card">
        <h3>Zutritt</h3>
        <ul class="legal-list">
          <li>Betrieb ausschließlich in Rechenzentren der Hetzner Online GmbH in Deutschland, mit deren Zutrittskontrolle. Eigene Räume mit Servern gibt es nicht.</li>
        </ul>

        <h3>Zugang</h3>
        <ul class="legal-list">
          <li>Von außen erreichbar sind nur die Webdienste und der Videoserver, alles Übrige ist durch eine Firewall gesperrt. Die Datenbank ist nur auf dem Server selbst erreichbar.</li>
          <li>Serverzugang nur für den Betreiber, über eine verschlüsselte Verbindung (SSH).</li>
          <li>Coachs melden sich mit bestätigter E-Mail-Adresse und Passwort an. Passwörter werden nur als Hash gespeichert, Sitzungs-Cookies sind für JavaScript nicht lesbar und laufen nach 7 Tagen ohne Nutzung ab.</li>
          <li>Klienten erhalten Zugang nur über persönliche Links mit zufälligem 256-Bit-Schlüssel, der Warteraum ist nur in einem Zeitfenster um den Termin geöffnet.</li>
        </ul>

        <h3>Zugriff und Trennung</h3>
        <ul class="legal-list">
          <li>Jeder Datensatz gehört genau einem Coach. Die Anwendung prüft bei jedem Zugriff, dass nur dieser Coach ihn sieht.</li>
          <li>Das Betreiber-Backoffice zeigt keine Klientendaten. Der Betreiber ist Mitglied keines Coach-Kontos und erreicht Klientendaten nicht über die Funktionen für Coachs.</li>
          <li>Speicher für Dateien privat, Abruf nur über die Anwendung mit kurz gültigen, signierten Adressen.</li>
        </ul>

        <h3>Weitergabe</h3>
        <ul class="legal-list">
          <li>Alle Verbindungen verschlüsselt (TLS). Bild und Ton im Gespräch verschlüsselt übertragen (DTLS/SRTP) und nur an die Teilnehmenden weitergeleitet, keine Aufzeichnung.</li>
          <li>Seiten für Klienten laden keine Inhalte von Dritten. Symbole, Schriften und die Bausteine des Weichzeichners kommen vom eigenen Server.</li>
          <li>Geteilte Dateien werden vor dem Speichern auf Viren geprüft, aus Bildern werden eingebettete Metadaten entfernt.</li>
        </ul>

        <h3>Eingabekontrolle und Protokolle</h3>
        <ul class="legal-list">
          <li>Server-Logs ohne Namen, E-Mail-Adressen und ohne die geheimen Schlüssel aus Zugangslinks. Löschung nach 14 Tagen.</li>
          <li>Fehlermeldungen werden vor dem Speichern bereinigt (keine Benutzerdaten, Inhalte oder Schlüssel) und nach 90 Tagen gelöscht.</li>
          <li>Löschungen von Klienten werden protokolliert, nur mit Kennungen und Anzahlen.</li>
        </ul>

        <h3>Verfügbarkeit und Wiederherstellung</h3>
        <ul class="legal-list">
          <li>Tägliche Sicherung von Datenbank und Dateien, verschlüsselt, in einem getrennten Speicher bei Hetzner in Nürnberg. Gesperrt gegen Löschen und Überschreiben für 30 Tage.</li>
          <li>Die Wiederherstellung ist erprobt. Ausbleibende Sicherungen, Fehler und Ausfälle des Servers lösen automatisch eine Benachrichtigung aus.</li>
        </ul>

        <h3>Löschung und Datenminimierung</h3>
        <ul class="legal-list">
          <li>Coachs löschen Klienten samt Terminen, Notizen, Chat und Dateien selbst. Unbestätigte Buchungsanfragen verfallen nach 30 Minuten.</li>
          <li>Löschfristen der Datensicherungen wie in Abschnitt 8.</li>
        </ul>

        <h3>Überprüfung</h3>
        <ul class="legal-list">
          <li>Die Maßnahmen werden bei Änderungen an HxRoom überprüft und in der technischen Dokumentation nachgeführt.</li>
        </ul>
      </div>
    </section>

    <p class="legal-updated">Stand: 27. Oktober 2026</p>
  </div>
</template>
