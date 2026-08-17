/**
 * Fachliche Inhalte der Testdaten. Bewusst getrennt von der Mechanik in ../seed.ts:
 * hier wird nur beschrieben *was* angelegt wird, nicht *wie*.
 *
 * Die Angebotstexte folgen doc/example-data/beispiel-sitzungsangebote.md, gekürzt auf
 * das, was im Editor mit den dort verfügbaren Werkzeugen reproduzierbar ist.
 */
import type { RichTextDoc } from '@hxroom/shared';

/**
 * Alle Seed-IDs tragen dieses Präfix. Der Reset löscht ausschließlich Zeilen, deren ID
 * damit beginnt – von Hand angelegte Accounts bleiben unangetastet. Gleichzeitig bleiben
 * Deep-Links wie /clients/seed-client-anna-1 über Reseeds hinweg stabil.
 */
export const SEED_ID_PREFIX = 'seed-';

/** Einheitlich für alle Demo-Coachs, damit man sich keine zwei Passwörter merken muss. */
export const SEED_PASSWORD = 'hxroom1234';

// --- Tiptap-Helfer ---------------------------------------------------------------
// Erzeugen ProseMirror-JSON in der Form, die richTextDocSchema (packages/shared) zulässt.
// Nur heading-Level 2: die Toolbar in apps/coach/app/pages/bookings/offers.vue bietet
// ausschließlich Level 2 an, ein Level-3-Knoten wäre im Editor nicht nachbaubar.

type Node = Record<string, unknown>;

const p = (text: string): Node => ({ type: 'paragraph', content: [{ type: 'text', text }] });
const h = (text: string): Node => ({ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text }] });
const ul = (...items: string[]): Node => ({
  type: 'bulletList',
  content: items.map((text) => ({ type: 'listItem', content: [p(text)] })),
});
const doc = (...content: Node[]): RichTextDoc => ({ type: 'doc', content }) as RichTextDoc;

// --- Angebote -------------------------------------------------------------------

export interface DemoOffer {
  slug: string; // Teil der ID: seed-offer-{coach}-{slug}
  name: string;
  durationMinutes: number;
  priceCents: number | null;
  description: RichTextDoc;
  isActive: boolean;
}

export const DEMO_OFFERS: DemoOffer[] = [
  {
    slug: 'erstgespraech',
    name: 'Erstgespräch',
    durationMinutes: 15,
    priceCents: null, // kostenlos – prüft die "kein Preis"-Darstellung
    isActive: true,
    description: doc(
      p('Lass uns unverbindlich kennenlernen. Im Erstgespräch erzählst du mir, was dich gerade beschäftigt, und wir schauen gemeinsam, ob und wie ich dich unterstützen kann.'),
      h('Darum geht’s'),
      ul(
        'Du schilderst dein Anliegen – so konkret oder offen, wie du magst',
        'Ich gebe dir einen ersten Eindruck, wie eine Zusammenarbeit aussehen könnte',
        'Am Ende weißt du, ob die Chemie stimmt und ob mein Angebot zu dir passt',
      ),
      p('Kein Verkaufsgespräch, kein Druck – einfach ein ehrliches erstes Gespräch.'),
    ),
  },
  {
    slug: 'coaching',
    name: 'Coaching-Sitzung',
    durationMinutes: 60,
    priceCents: 10000,
    isActive: true,
    description: doc(
      p('In der Coaching-Sitzung arbeiten wir konzentriert an deinem aktuellen Anliegen – ob berufliche Entscheidung, ein festgefahrenes Muster oder ein Ziel, das du klarer fassen willst.'),
      h('Was dich erwartet'),
      ul(
        'Ein kurzer Check-in zu deinem Anliegen und dem, was sich seit dem letzten Mal getan hat',
        'Gezielte Fragen und Methoden, die neue Perspektiven öffnen',
        'Ein oder zwei konkrete Schritte, die du danach direkt umsetzen kannst',
      ),
    ),
  },
  {
    slug: 'intensiv',
    name: 'Intensiv-Session',
    durationMinutes: 90,
    priceCents: 15000,
    isActive: true,
    description: doc(
      p('Die Intensiv-Session ist für die großen Themen: eine wichtige Entscheidung, ein Wendepunkt oder eine Frage, die mehr Raum braucht als eine reguläre Sitzung.'),
      h('Ablauf'),
      ul(
        'Ankommen & Fokus – wir klären, worum es heute im Kern geht',
        'Tiefenarbeit – wir beleuchten dein Thema aus mehreren Perspektiven',
        'Verdichtung – wir bündeln die Erkenntnisse zu einem klaren Bild',
        'Dein Fahrplan – du gehst mit konkreten nächsten Schritten hinaus',
      ),
    ),
  },
  {
    slug: 'workshop',
    name: 'Workshop',
    durationMinutes: 120,
    priceCents: 60000,
    // Bewusst inaktiv: füllt den aktiv/inaktiv-Zähler auf /bookings/offers und belegt,
    // dass die öffentliche Buchungsseite inaktive Angebote ausblendet.
    isActive: false,
    description: doc(
      p('Der Workshop eignet sich für Teams oder Gruppen, die gemeinsam an einem Thema arbeiten möchten – strukturiert, interaktiv und mit greifbaren Ergebnissen.'),
      h('Inhalte'),
      ul(
        'Gemeinsame Einordnung des Themas und der Ausgangslage',
        'Interaktive Übungen und Methoden, angepasst an die Gruppe',
        'Sammlung und Priorisierung konkreter Maßnahmen',
      ),
    ),
  },
];

// --- Verfügbarkeit --------------------------------------------------------------

export interface DemoAvailabilitySlot {
  weekday: number; // 0 = Montag … 6 = Sonntag (siehe schema.ts, NICHT getDay())
  startTime: string;
  endTime: string;
}

/** Zwei Fenster an den meisten Tagen, plus ein Samstagstermin fürs Wochenende im Raster. */
export const DEMO_AVAILABILITY: DemoAvailabilitySlot[] = [
  { weekday: 0, startTime: '09:00', endTime: '12:00' },
  { weekday: 0, startTime: '14:00', endTime: '18:00' },
  { weekday: 1, startTime: '09:00', endTime: '12:00' },
  { weekday: 1, startTime: '14:00', endTime: '18:00' },
  { weekday: 2, startTime: '09:00', endTime: '13:00' },
  { weekday: 3, startTime: '09:00', endTime: '12:00' },
  { weekday: 3, startTime: '14:00', endTime: '18:00' },
  { weekday: 4, startTime: '09:00', endTime: '12:00' },
  { weekday: 5, startTime: '10:00', endTime: '13:00' },
];

/** Alle Werte existieren als Select-Option in apps/coach/app/pages/bookings/availability.vue. */
export const DEMO_AVAILABILITY_SETTINGS = {
  bufferMinutes: 15,
  minLeadTimeHours: 24,
  bookingWindowWeeks: 4,
};

// --- Klienten -------------------------------------------------------------------

export interface DemoClient {
  slug: string;
  name: string;
  email: string;
  phone: string | null;
  note: string | null;
  /** Steuert, welche Buchungen booking-plan.ts diesem Klienten zuweist. */
  history: 'both' | 'past-only' | 'future-only' | 'none';
}

export const DEMO_CLIENTS: DemoClient[] = [
  {
    slug: '1', name: 'Miriam Kastner', email: 'miriam.kastner@example.com',
    phone: '+49 151 23456789',
    note: 'Arbeitet an der Entscheidung zwischen Teamleitung und Fachkarriere. Braucht eher Struktur als Impulse.',
    history: 'both',
  },
  {
    slug: '2', name: 'Jonas Feldmann', email: 'jonas.feldmann@example.com',
    phone: '+49 170 9876543',
    note: 'Sehr reflektiert, neigt zum Grübeln. Konkrete Aufgaben zum Abschluss helfen ihm.',
    history: 'both',
  },
  {
    slug: '3', name: 'Sabine Wolters', email: 'sabine.wolters@example.com',
    phone: null, note: null,
    history: 'both',
  },
  {
    slug: '4', name: 'Deniz Yildirim', email: 'deniz.yildirim@example.com',
    phone: '+49 160 5551234',
    note: 'Wechsel in die Selbstständigkeit geplant, Zeithorizont Frühjahr.',
    history: 'both',
  },
  {
    slug: '5', name: 'Claudia Reinhold', email: 'claudia.reinhold@example.com',
    phone: null,
    note: 'Termine bitte möglichst vormittags.',
    history: 'both',
  },
  {
    // Abgeschlossene Zusammenarbeit: nextSessionAt bleibt null
    slug: '6', name: 'Peter Lang', email: 'peter.lang@example.com',
    phone: '+49 152 4433221',
    note: 'Zusammenarbeit im Sommer abgeschlossen. Wollte sich bei Bedarf wieder melden.',
    history: 'past-only',
  },
  {
    // Neu gewonnen: sessionCount 0, aber ein Termin steht an
    slug: '7', name: 'Anke Brenner', email: 'anke.brenner@example.com',
    phone: null, note: null,
    history: 'future-only',
  },
  {
    // Manuell erfasster Bestandsklient ohne jede Buchung (ClientsService.create-Fall)
    slug: '8', name: 'Tarek Nouri', email: 'tarek.nouri@example.com',
    phone: '+49 176 1122334',
    note: 'Aus dem alten Kalender übernommen, Ersttermin noch offen.',
    history: 'none',
  },
];

// --- Coachs ---------------------------------------------------------------------

export interface DemoCoach {
  slug: string; // ID-Bestandteil und organization.slug (= Subdomain)
  name: string;
  email: string;
  bookingPage: { tagline: string; bio: string; ctaButton: string; ctaIntro: string } | null;
  /** false = frisch registrierter Coach ohne Daten, für Empty-States. */
  populated: boolean;
  /**
   * Tage bis zur vorgemerkten Kontolöschung, oder null für keine laufende Löschung.
   *
   * Ohne so einen Coach sind Warnbanner, Widerruf und die offline geschaltete Buchungsseite
   * nur über Handarbeit in der Datenbank zu sehen.
   */
  deletionInDays: number | null;
}

export const DEMO_COACHES: DemoCoach[] = [
  {
    slug: 'anna',
    name: 'Anna Bergmann',
    email: 'anna@hxroom.test',
    populated: true,
    deletionInDays: null,
    bookingPage: {
      tagline: 'Coaching für berufliche Wendepunkte',
      bio: 'Ich arbeite mit Menschen, die an einem Wendepunkt stehen – beruflich, persönlich oder beides. '
        + 'Seit acht Jahren begleite ich Führungskräfte und Selbstständige dabei, Klarheit über ihren '
        + 'nächsten Schritt zu gewinnen. Meine Arbeit ist ruhig, direkt und ohne Ratschläge von der Stange.',
      ctaButton: 'Termin auswählen',
      ctaIntro: 'Wähle ein Angebot und einen Zeitpunkt, der dir passt.',
    },
  },
  {
    slug: 'tobias',
    name: 'Tobias Reinhardt',
    email: 'tobias@hxroom.test',
    populated: false,
    bookingPage: null,
    deletionInDays: null,
  },
  // Coach mit laufender Kontolöschung: zeigt Warnbanner, Widerrufs-Ansicht auf der
  // Account-Seite und die offline geschaltete Buchungsseite. Bewusst mit Daten, damit
  // sichtbar ist, was an der Löschung hängt.
  {
    slug: 'martina',
    name: 'Martina Kühl',
    email: 'martina@hxroom.test',
    populated: true,
    deletionInDays: 12,
    bookingPage: {
      tagline: 'Systemisches Coaching für Teams',
      bio: 'Ich begleite Teams durch Umbrüche: neue Rollen, neue Führung, neue Richtung. '
        + 'Mein Zugang ist systemisch – wir schauen auf das Zusammenspiel, nicht auf einzelne Schuldige.',
      ctaButton: 'Termin anfragen',
      ctaIntro: 'Wähle ein Format und einen Zeitpunkt.',
    },
  },
];
