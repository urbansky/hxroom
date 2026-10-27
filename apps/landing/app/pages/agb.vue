<script setup lang="ts">
definePageMeta({ layout: 'legal' })

useHead({
  title: 'AGB · HxRoom',
  meta: [
    { name: 'description', content: 'Allgemeine Geschäftsbedingungen von HxRoom für Coachs – Leistungen, Beta, Pflichten, Kündigung und Haftung.' },
    { name: 'robots', content: 'noindex, follow' },
  ],
})
</script>

<template>
  <!-- AGB zwischen HxRoom und den Coachs (doc/legal.md §5.1), Fassung für die kostenlose Beta.
       Stile aus @hxroom/ui/theme (legal.css). Änderungen am Text: Stand-Datum unten und
       TERMS_VERSION in packages/shared/src/terms.ts mitziehen. -->
  <div class="legal-container">
    <span class="legal-eyebrow">Rechtliches</span>
    <h1 class="legal-headline">Allgemeine Geschäfts&shy;bedingungen</h1>
    <p class="legal-sub">Die Regeln für die Nutzung von HxRoom als Coach – so kurz wie möglich, so genau wie nötig.</p>

    <!-- AUF EINEN BLICK -->
    <div class="legal-glance">
      <div class="legal-glance-tile">
        <div class="icon">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 12v9H4v-9" />
            <path d="M2 7h20v5H2z" />
            <path d="M12 21V7" />
          </svg>
        </div>
        <h4>Kostenlos in der Beta</h4>
        <p>Bezahlt wird erst, wenn du einem Tarif ausdrücklich zustimmst. Automatisch passiert nichts.</p>
      </div>
      <div class="legal-glance-tile">
        <div class="icon">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </div>
        <h4>Jederzeit kündbar</h4>
        <p>Ohne Frist, mit einem Klick in den Einstellungen.</p>
      </div>
      <div class="legal-glance-tile">
        <div class="icon">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 3v12" />
            <path d="M7 10l5 5 5-5" />
            <path d="M5 21h14" />
          </svg>
        </div>
        <h4>Deine Daten bleiben deine</h4>
        <p>Du exportierst sie jederzeit. Nach einer Kündigung werden sie vollständig gelöscht.</p>
      </div>
      <div class="legal-glance-tile">
        <div class="icon">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <h4>Für Selbständige</h4>
        <p>HxRoom richtet sich an Coachs, die beruflich selbständig arbeiten.</p>
      </div>
    </div>

    <!-- 1. GELTUNGSBEREICH -->
    <section class="legal-section">
      <div class="legal-section-label"><span class="num">1</span> Geltungsbereich und Anbieter</div>
      <div class="legal-card">
        <p>Diese Allgemeinen Geschäftsbedingungen gelten für die Nutzung von HxRoom durch Coachs. Anbieter ist:</p>
        <p class="legal-address">
          <strong>Dr.-Ing. Stefan Urbansky</strong><br>
          Dresdner Landstraße 30e<br>
          01728 Bannewitz
        </p>
        <p>In diesen Bedingungen steht „ich“ für den Anbieter und „du“ für den Coach.</p>
        <p>HxRoom richtet sich ausschließlich an Unternehmer im Sinne von § 14 BGB, also an Coachs, die HxRoom für ihre selbständige berufliche Tätigkeit nutzen. Mit der Registrierung bestätigst du, dass das auf dich zutrifft.</p>
        <p>Eigene Geschäftsbedingungen des Coachs gelten nicht, auch wenn ich ihnen nicht ausdrücklich widerspreche.</p>
      </div>
    </section>

    <!-- 2. LEISTUNGEN -->
    <section class="legal-section">
      <div class="legal-section-label"><span class="num">2</span> Was HxRoom leistet</div>
      <div class="legal-card">
        <p>HxRoom ist eine Webanwendung für Coachs. Dazu gehören insbesondere:</p>
        <ul class="legal-list">
          <li>eine eigene Buchungsseite unter einer Subdomain von hxroom.de</li>
          <li>Terminbuchung durch Klienten, ohne dass diese ein Konto brauchen</li>
          <li>Bestätigungs- und Erinnerungsmails an deine Klienten</li>
          <li>Warteraum und Videogespräch im Browser, mit Chat und geteilten Dateien</li>
          <li>Verwaltung deiner Klienten, Termine und Notizen</li>
          <li>Export deiner Daten auf Knopfdruck</li>
        </ul>
        <p>Den genauen Umfang zeigt die Anwendung in ihrer jeweils aktuellen Fassung. Ich entwickle HxRoom laufend weiter und kann dabei Funktionen ändern, ergänzen oder entfernen. Buchung, Videogespräch und Datenexport bleiben erhalten, solange der Vertrag läuft.</p>
        <p>Den Vertrag über dein Coaching schließt du direkt mit deinen Klienten. Ich bin nicht Partei dieses Vertrags und wickle auch keine Zahlungen zwischen dir und deinen Klienten ab.</p>
      </div>
    </section>

    <!-- 3. BETA -->
    <section class="legal-section">
      <div class="legal-section-label"><span class="num">3</span> Beta und Kosten</div>
      <div class="legal-card">
        <p>HxRoom befindet sich in der Beta. Während der Beta ist die Nutzung <strong>kostenlos</strong>.</p>
        <p>In der Beta kann sich HxRoom häufiger ändern als später, und es können Fehler auftreten. Ich behebe sie so schnell wie möglich und freue mich über jede Rückmeldung über den Feedback-Knopf in der App.</p>

        <h3>Ende der Beta</h3>
        <p>Das Ende der Beta und die dann geltenden Preise kündige ich dir mindestens vier Wochen vorher per E-Mail an. Kostenpflichtig wird die Nutzung nur, wenn du einem Tarif ausdrücklich zustimmst. Stimmst du nicht zu, endet der Vertrag mit dem Ende der Beta. Bis dahin kannst du deine Daten exportieren. Danach werden sie gelöscht, wie in Abschnitt 9 beschrieben.</p>
      </div>
    </section>

    <!-- 4. KONTO -->
    <section class="legal-section">
      <div class="legal-section-label"><span class="num">4</span> Registrierung und Konto</div>
      <div class="legal-card">
        <p>Der Vertrag kommt zustande, wenn du dich registrierst und deine E-Mail-Adresse bestätigst. Einen Anspruch auf Abschluss gibt es nicht.</p>
        <ul class="legal-list">
          <li>Deine Angaben bei der Registrierung müssen wahr sein. Ändern sie sich, passt du sie in den Einstellungen an.</li>
          <li>Dein Konto ist persönlich und nicht übertragbar.</li>
          <li>Halte dein Passwort geheim. Vermutest du, dass jemand anderes Zugriff auf dein Konto hat, ändere es sofort und schreib mir.</li>
        </ul>
      </div>
    </section>

    <!-- 5. PFLICHTEN -->
    <section class="legal-section">
      <div class="legal-section-label"><span class="num">5</span> Deine Pflichten</div>

      <div class="legal-card">
        <h3>Impressum und Inhalte</h3>
        <p>Auf deiner Buchungsseite trittst du als Anbieter auf. Deine Angaben im Impressum müssen vollständig und richtig sein. Ohne Impressum lässt sich deine Buchungsseite nicht buchen. Für deine Angaben und alle Inhalte, die du in HxRoom einstellst – Texte, Bilder, Angebote, Links –, bist du verantwortlich. Sie dürfen nicht gegen geltendes Recht oder Rechte Dritter verstoßen.</p>
      </div>

      <div class="legal-card">
        <h3>Coaching, keine Heilbehandlung</h3>
        <p>HxRoom ist für Coaching gedacht. Du gibst über HxRoom keine Heilversprechen ab und übst keine Heilkunde oder Psychotherapie aus, für die du keine Erlaubnis hast.</p>
      </div>

      <div class="legal-card">
        <h3>Gegenüber deinen Klienten</h3>
        <ul class="legal-list">
          <li>Preise, Stornoregeln, eine Widerrufsbelehrung und eigene Geschäftsbedingungen gegenüber deinen Klienten liegen in deiner Verantwortung.</li>
          <li>Du zeichnest Gespräche nicht ohne Einwilligung aller Beteiligten auf, auch nicht mit anderen Werkzeugen.</li>
          <li>Du nutzt die Daten deiner Klienten nur im Rahmen deines Coachings und des Datenschutzrechts (siehe Abschnitt 6).</li>
        </ul>
      </div>

      <div class="legal-card">
        <h3>Fairer Umgang mit HxRoom</h3>
        <p>Du nutzt HxRoom nicht für Werbung ohne Einwilligung, für Angriffe auf HxRoom oder andere Systeme, zum automatisierten Auslesen von Daten oder um Schutzmaßnahmen zu umgehen.</p>
      </div>
    </section>

    <!-- 6. DATENSCHUTZ -->
    <section class="legal-section">
      <div class="legal-section-label"><span class="num">6</span> Datenschutz und Auftragsverarbeitung</div>
      <div class="legal-card">
        <p>Für die Daten deines Kontos bin ich verantwortlich. Wie ich sie verarbeite, steht in der <NuxtLink to="/datenschutz">Datenschutzerklärung</NuxtLink>.</p>
        <p>Für die Daten deiner Klienten bist du verantwortlich, ich verarbeite sie in deinem Auftrag. Dafür schließen wir einen <NuxtLink to="/avv">Vertrag zur Auftragsverarbeitung</NuxtLink> nach Art. 28 DSGVO (AVV). Er ist Bestandteil dieses Vertrags und nennt auch die Dienstleister, die ich dabei einsetze.</p>
        <p>Auf deiner Buchungsseite informiert die gemeinsame Datenschutzerklärung von HxRoom deine Klienten darüber, wie ihre Daten in HxRoom verarbeitet werden. Abschnitt 8 nennt dich dort als Verantwortlichen. Du machst dir diesen Abschnitt für die Verarbeitung in HxRoom zu eigen. Was du außerhalb von HxRoom mit den Daten tust, deckt er nicht ab. Dafür kannst du in den Einstellungen eine eigene Datenschutzerklärung verlinken.</p>
      </div>
    </section>

    <!-- 7. VERFÜGBARKEIT -->
    <section class="legal-section">
      <div class="legal-section-label"><span class="num">7</span> Verfügbarkeit und Datensicherung</div>
      <div class="legal-card">
        <p>Ich bemühe mich, HxRoom ständig verfügbar zu halten, sichere aber keine bestimmte Verfügbarkeit zu. Wartungsarbeiten lege ich möglichst in Zeiten mit wenig Nutzung und kündige sie an, wenn sie sich planen lassen. Für Störungen außerhalb meines Einflusses, etwa im Internet oder in deinem Browser, bin ich nicht verantwortlich.</p>
        <p>Ich sichere die Daten von HxRoom täglich. Unabhängig davon empfehle ich dir, deine Daten regelmäßig über den Export zu sichern.</p>
      </div>
    </section>

    <!-- 8. RECHTE -->
    <section class="legal-section">
      <div class="legal-section-label"><span class="num">8</span> Rechte an Inhalten und Software</div>
      <div class="legal-card">
        <p>Deine Inhalte bleiben deine. Du räumst mir nur die Rechte ein, die ich brauche, um HxRoom für dich zu betreiben – etwa um deine Texte und Bilder zu speichern und auf deiner Buchungsseite anzuzeigen.</p>
        <p>Die Rechte an HxRoom selbst bleiben bei mir. Für die Dauer des Vertrags darfst du HxRoom für deine Tätigkeit nutzen. Dieses Recht ist nicht übertragbar.</p>
      </div>
    </section>

    <!-- 9. LAUFZEIT -->
    <section class="legal-section">
      <div class="legal-section-label"><span class="num">9</span> Laufzeit, Kündigung und Löschung</div>
      <div class="legal-card">
        <p>Der Vertrag läuft unbefristet. Du kannst ihn jederzeit ohne Frist kündigen, indem du dein Konto in den Einstellungen löschst oder mir in Textform schreibst, etwa per E-Mail. Ich kann ihn mit einer Frist von vier Wochen kündigen.</p>
        <p>Das Recht zur fristlosen Kündigung aus wichtigem Grund bleibt für beide Seiten unberührt. Ein wichtiger Grund liegt für mich insbesondere vor, wenn du erheblich gegen Abschnitt 5 verstößt. In solchen Fällen kann ich deine Buchungsseite oder dein Konto auch vorübergehend sperren, wenn das nötig ist, um Schaden abzuwenden.</p>

        <div class="legal-callout">
          <strong>Was mit deinen Daten passiert.</strong> Nach dem Ende des Vertrags bleiben deine Daten noch 30 Tage erhalten. In dieser Zeit kannst du eine Löschung über dein Konto widerrufen und deine Daten exportieren. Danach lösche ich dein Konto endgültig, mit allen Inhalten und Klientendaten. Aus den Datensicherungen verschwinden sie nach den Fristen in der <NuxtLink to="/datenschutz">Datenschutzerklärung</NuxtLink>.
        </div>
      </div>
    </section>

    <!-- 10. HAFTUNG -->
    <section class="legal-section">
      <div class="legal-section-label"><span class="num">10</span> Haftung</div>
      <div class="legal-card">
        <p>Ich hafte unbeschränkt bei Vorsatz und grober Fahrlässigkeit, für Schäden aus der Verletzung des Lebens, des Körpers oder der Gesundheit, nach dem Produkthaftungsgesetz und soweit ich eine Garantie übernommen habe.</p>
        <p>Bei leichter Fahrlässigkeit hafte ich nur, wenn ich eine wesentliche Vertragspflicht verletze – eine Pflicht, deren Erfüllung den Vertrag überhaupt erst möglich macht und auf die du regelmäßig vertrauen darfst. Die Haftung ist dann auf den vertragstypischen, vorhersehbaren Schaden begrenzt.</p>
        <p>Im Übrigen ist meine Haftung ausgeschlossen. Das gilt auch für meine Erfüllungsgehilfen.</p>
      </div>
    </section>

    <!-- 11. ÄNDERUNGEN -->
    <section class="legal-section">
      <div class="legal-section-label"><span class="num">11</span> Änderungen dieser Bedingungen</div>
      <div class="legal-card">
        <p>Ich kann diese Bedingungen ändern, etwa wenn sich HxRoom oder die Rechtslage ändert. Änderungen schicke ich dir mindestens vier Wochen vor ihrem Inkrafttreten per E-Mail. Widersprichst du nicht innerhalb dieser Frist, gelten sie als angenommen. Auf diese Folge weise ich dich in der E-Mail ausdrücklich hin. Widersprichst du, können wir beide den Vertrag zum Inkrafttreten der Änderung kündigen.</p>
        <p>Preise und kostenpflichtige Tarife führe ich auf diesem Weg nicht ein. Dafür brauche ich immer deine ausdrückliche Zustimmung (Abschnitt 3).</p>
      </div>
    </section>

    <!-- 12. SCHLUSS -->
    <section class="legal-section">
      <div class="legal-section-label"><span class="num">12</span> Schlussbestimmungen</div>
      <div class="legal-card">
        <ul class="legal-list">
          <li>Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts.</li>
          <li>Bist du Kaufmann, juristische Person des öffentlichen Rechts oder öffentlich-rechtliches Sondervermögen, ist Gerichtsstand mein Sitz.</li>
          <li>Erklärungen zu diesem Vertrag genügen in Textform, etwa per E-Mail.</li>
          <li>Die jeweils aktuelle Fassung dieser Bedingungen steht unter hxroom.de/agb. Die Fassung, der du zugestimmt hast, schicke ich dir auf Anfrage.</li>
          <li>Ist eine Bestimmung unwirksam, bleibt der Vertrag im Übrigen wirksam. An die Stelle der unwirksamen Bestimmung tritt die gesetzliche Regelung.</li>
        </ul>
      </div>
    </section>

    <p class="legal-updated">Stand: 27. Oktober 2026</p>
  </div>
</template>
