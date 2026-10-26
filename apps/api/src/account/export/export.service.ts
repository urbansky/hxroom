import { HttpException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { and, asc, eq, inArray, lt, ne } from 'drizzle-orm';
import { strToU8, zipSync, type Zippable } from 'fflate';
import type { BookingOrigin, BookingStatus, CallChatSender, CancelledBy } from '@hxroom/shared';
import { DRIZZLE, type DrizzleDb } from '../../db/db.module';
import {
  availabilitySettings,
  availabilitySlots,
  bookingPage,
  bookings,
  clients,
  offers,
  organization,
  sessionChatFiles,
  sessionChatMessages,
  sessionNotes,
} from '../../db/schema';
import { HELD_SESSION_STATUSES } from '../../bookings/booking.constants';
import { toCsv } from './csv';
import { richTextToMarkdown } from './rich-text-markdown';

/**
 * Datenexport des Coachs (phase5-umsetzungsplan.md, Schritt 10): eine ZIP-Datei mit
 * Klienten und Terminen als CSV, Notizen und Chat-Verläufen als Markdown und allem
 * zusammen als JSON.
 *
 * Direkt im Request gebaut, ohne Ablage im Speicher: Die Datenmengen sind klein, und es
 * bleibt keine Datei zum Aufräumen liegen. Probe-Sitzungen fehlen bewusst (sie werden nach
 * 24 Stunden ohnehin gelöscht), ebenso Zugangstoken und die Dateien aus dem Chat.
 */

const TIME_ZONE = 'Europe/Berlin';
const dateFormatter = new Intl.DateTimeFormat('de-DE', { timeZone: TIME_ZONE, day: '2-digit', month: '2-digit', year: 'numeric' });
const timeFormatter = new Intl.DateTimeFormat('de-DE', { timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit' });
const isoDayFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' });

const STATUS_LABELS: Record<BookingStatus, string> = {
  pending: 'unbestätigt',
  confirmed: 'bestätigt',
  completed: 'abgeschlossen',
  cancelled: 'abgesagt',
  no_show: 'nicht erschienen',
};

const ORIGIN_LABELS: Record<BookingOrigin, string> = {
  booking_page: 'Buchungsseite',
  ad_hoc: 'Spontan-Termin',
  test: 'Probe-Sitzung',
};

const CANCELLED_BY_LABELS: Record<CancelledBy, string> = {
  coach: 'Coach',
  client: 'Klient',
  system: 'automatisch (nicht bestätigt)',
};

const SENDER_LABELS: Record<CallChatSender, string> = { coach: 'Coach', client: 'Klient' };

const WEEKDAYS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

export interface DataExport {
  fileName: string;
  zip: Uint8Array;
}

/** „Jörg Müller“ → „joerg-mueller“, für Dateinamen in der ZIP-Datei. */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'termin';
}

function formatDate(date: Date): string {
  return dateFormatter.format(date);
}

function formatTime(date: Date): string {
  return timeFormatter.format(date);
}

/** Mindestabstand zwischen zwei Exporten derselben Organisation. */
export const EXPORT_COOLDOWN_MS = 30 * 1000;

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);
  /** Letzter Export je Organisation. Im Speicher genügt: Es geht um Doppelklicks, nicht um Angriffe. */
  private readonly lastExport = new Map<string, number>();

  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async build(organizationId: string, now = new Date()): Promise<DataExport> {
    const last = this.lastExport.get(organizationId);
    if (last !== undefined && now.getTime() - last < EXPORT_COOLDOWN_MS) {
      throw new HttpException('Please wait a moment before exporting again', HttpStatus.TOO_MANY_REQUESTS);
    }
    this.lastExport.set(organizationId, now.getTime());

    const [org] = await this.db
      .select({ name: organization.name, slug: organization.slug })
      .from(organization)
      .where(eq(organization.id, organizationId))
      .limit(1);

    const [page] = await this.db.select().from(bookingPage).where(eq(bookingPage.organizationId, organizationId)).limit(1);
    const [settings] = await this.db.select().from(availabilitySettings).where(eq(availabilitySettings.organizationId, organizationId)).limit(1);
    const slots = await this.db.select().from(availabilitySlots).where(eq(availabilitySlots.organizationId, organizationId)).orderBy(asc(availabilitySlots.weekday), asc(availabilitySlots.startTime));
    const offerRows = await this.db.select().from(offers).where(eq(offers.organizationId, organizationId)).orderBy(asc(offers.sortOrder));
    const clientRows = await this.db.select().from(clients).where(eq(clients.organizationId, organizationId)).orderBy(asc(clients.name));
    const bookingRows = await this.db
      .select()
      .from(bookings)
      .where(and(eq(bookings.organizationId, organizationId), ne(bookings.origin, 'test')))
      .orderBy(asc(bookings.startTime));

    const bookingIds = bookingRows.map((b) => b.id);
    const notes = bookingIds.length
      ? await this.db.select().from(sessionNotes).where(and(eq(sessionNotes.organizationId, organizationId), inArray(sessionNotes.bookingId, bookingIds)))
      : [];
    const messages = bookingIds.length
      ? await this.db
        .select({
          bookingId: sessionChatMessages.bookingId,
          sender: sessionChatMessages.sender,
          text: sessionChatMessages.text,
          createdAt: sessionChatMessages.createdAt,
          fileName: sessionChatFiles.fileName,
          fileRemovedAt: sessionChatMessages.fileRemovedAt,
        })
        .from(sessionChatMessages)
        .leftJoin(sessionChatFiles, eq(sessionChatFiles.messageId, sessionChatMessages.id))
        .where(and(eq(sessionChatMessages.organizationId, organizationId), inArray(sessionChatMessages.bookingId, bookingIds)))
        .orderBy(asc(sessionChatMessages.seq))
      : [];

    // Gehaltene Sitzungen je Klient – dieselbe Regel wie in der Klientenliste
    const heldRows = await this.db
      .select({ clientId: bookings.clientId })
      .from(bookings)
      .where(and(
        eq(bookings.organizationId, organizationId),
        inArray(bookings.status, [...HELD_SESSION_STATUSES]),
        lt(bookings.startTime, now),
        ne(bookings.origin, 'test'),
      ));
    const heldByClient = new Map<string, number>();
    for (const row of heldRows) {
      if (row.clientId) heldByClient.set(row.clientId, (heldByClient.get(row.clientId) ?? 0) + 1);
    }

    const notesByBooking = new Map(notes.map((n) => [n.bookingId, n]));
    const messagesByBooking = new Map<string, typeof messages>();
    for (const message of messages) {
      const list = messagesByBooking.get(message.bookingId) ?? [];
      list.push(message);
      messagesByBooking.set(message.bookingId, list);
    }

    // Dateinamen je Termin: Datum, Uhrzeit, Klient – bei Gleichstand mit Zähler
    const usedNames = new Set<string>();
    const fileBase = new Map<string, string>();
    for (const booking of bookingRows) {
      const day = isoDayFormatter.format(booking.startTime);
      const time = formatTime(booking.startTime).replace(':', '');
      let base = `${day}_${time}_${slugify(booking.clientName)}`;
      for (let n = 2; usedNames.has(base); n++) base = `${day}_${time}_${slugify(booking.clientName)}-${n}`;
      usedNames.add(base);
      fileBase.set(booking.id, base);
    }

    const notesFiles: Zippable = {};
    const chatFiles: Zippable = {};
    const bookingHeader = (b: (typeof bookingRows)[number]) => [
      `- Termin: ${formatDate(b.startTime)}, ${formatTime(b.startTime)}–${formatTime(b.endTime)} Uhr`,
      `- Klient: ${b.clientName} (${b.clientEmail})`,
      `- Angebot: ${b.offerName}, ${b.durationMinutes} Min.`,
      `- Status: ${STATUS_LABELS[b.status]}`,
    ].join('\n');

    for (const booking of bookingRows) {
      const base = fileBase.get(booking.id)!;
      const note = notesByBooking.get(booking.id);
      const noteMarkdown = richTextToMarkdown(note?.content);
      if (noteMarkdown) {
        notesFiles[`${base}.md`] = strToU8(`# Notizen\n\n${bookingHeader(booking)}\n\n---\n\n${noteMarkdown}`);
      }
      const chat = messagesByBooking.get(booking.id);
      if (chat?.length) {
        const lines = chat.map((m) => {
          const file = m.fileName ? ` [Datei: ${m.fileName}${m.fileRemovedAt ? ', entfernt' : ''}]` : '';
          return `**${formatTime(m.createdAt)} · ${SENDER_LABELS[m.sender]}:** ${m.text}${file}`;
        });
        chatFiles[`${base}.md`] = strToU8(`# Chat\n\n${bookingHeader(booking)}\n\n---\n\n${lines.join('\n\n')}\n`);
      }
    }

    const clientsCsv = toCsv(clientRows, [
      { header: 'Name', value: (c) => c.name },
      { header: 'E-Mail', value: (c) => c.email },
      { header: 'Telefon', value: (c) => c.phone },
      { header: 'Interne Notiz', value: (c) => c.note },
      { header: 'Angelegt am', value: (c) => formatDate(c.createdAt) },
      { header: 'Gehaltene Sitzungen', value: (c) => heldByClient.get(c.id) ?? 0 },
    ]);

    const bookingsCsv = toCsv(bookingRows, [
      { header: 'Datum', value: (b) => formatDate(b.startTime) },
      { header: 'Beginn', value: (b) => formatTime(b.startTime) },
      { header: 'Ende', value: (b) => formatTime(b.endTime) },
      { header: 'Angebot', value: (b) => b.offerName },
      { header: 'Dauer (Min.)', value: (b) => b.durationMinutes },
      { header: 'Status', value: (b) => STATUS_LABELS[b.status] },
      { header: 'Herkunft', value: (b) => ORIGIN_LABELS[b.origin] },
      { header: 'Klient', value: (b) => b.clientName },
      { header: 'E-Mail', value: (b) => b.clientEmail },
      { header: 'Telefon', value: (b) => b.clientPhone },
      { header: 'Nachricht zur Buchung', value: (b) => b.clientNote },
      { header: 'Abgesagt durch', value: (b) => (b.cancelledBy ? CANCELLED_BY_LABELS[b.cancelledBy] : null) },
      { header: 'Absagegrund', value: (b) => b.cancellationReason },
      { header: 'Notizen', value: (b) => (notesFiles[`${fileBase.get(b.id)}.md`] ? `notizen/${fileBase.get(b.id)}.md` : null) },
    ]);

    const data = {
      exportedAt: now.toISOString(),
      timeZone: TIME_ZONE,
      organization: { name: org?.name ?? null, subdomain: org?.slug ?? null },
      bookingPage: page
        ? {
          tagline: page.tagline,
          bio: page.bio,
          ctaButton: page.ctaButton,
          ctaIntro: page.ctaIntro,
          jobTitle: page.jobTitle,
          topics: page.topics,
          quote: page.quote,
          qualifications: page.qualifications,
          imprintMode: page.imprintMode,
          imprint: page.imprint,
          imprintUrl: page.imprintUrl,
          privacyUrl: page.privacyUrl,
          termsUrl: page.termsUrl,
        }
        : null,
      offers: offerRows.map((o) => ({
        name: o.name,
        durationMinutes: o.durationMinutes,
        priceCents: o.priceCents,
        isActive: o.isActive,
        description: richTextToMarkdown(o.description) || null,
      })),
      availability: {
        bufferMinutes: settings?.bufferMinutes ?? null,
        minLeadTimeHours: settings?.minLeadTimeHours ?? null,
        bookingWindowWeeks: settings?.bookingWindowWeeks ?? null,
        slots: slots.map((s) => ({ weekday: WEEKDAYS[s.weekday], start: s.startTime, end: s.endTime })),
      },
      clients: clientRows.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        note: c.note,
        createdAt: c.createdAt.toISOString(),
        heldSessions: heldByClient.get(c.id) ?? 0,
      })),
      bookings: bookingRows.map((b) => ({
        id: b.id,
        clientId: b.clientId,
        start: b.startTime.toISOString(),
        end: b.endTime.toISOString(),
        offerName: b.offerName,
        durationMinutes: b.durationMinutes,
        status: b.status,
        origin: b.origin,
        clientName: b.clientName,
        clientEmail: b.clientEmail,
        clientPhone: b.clientPhone,
        clientNote: b.clientNote,
        cancelledBy: b.cancelledBy,
        cancellationReason: b.cancellationReason,
        notes: richTextToMarkdown(notesByBooking.get(b.id)?.content) || null,
        chat: (messagesByBooking.get(b.id) ?? []).map((m) => ({
          at: m.createdAt.toISOString(),
          sender: m.sender,
          text: m.text,
          fileName: m.fileName ?? null,
          fileRemoved: m.fileRemovedAt !== null,
        })),
      })),
    };

    const day = isoDayFormatter.format(now);
    const readme = [
      `Datenexport aus HxRoom`,
      ``,
      `Erstellt: ${formatDate(now)}, ${formatTime(now)} Uhr`,
      `Coach: ${org?.name ?? ''}${org?.slug ? ` (${org.slug})` : ''}`,
      ``,
      `Inhalt`,
      `- klienten.csv: alle Klienten mit Kontaktdaten und interner Notiz`,
      `- termine.csv: alle Termine, auch vergangene und abgesagte`,
      `- notizen/: deine Notizen je Termin als Markdown-Datei`,
      `- chat/: der Chat-Verlauf je Termin als Markdown-Datei`,
      `- daten.json: alles zusammen, maschinenlesbar, dazu Angebote, Verfügbarkeiten und die Texte deiner Buchungsseite`,
      ``,
      `Hinweise`,
      `- Alle Uhrzeiten in deutscher Zeit (Europe/Berlin). daten.json enthält zusätzlich die genauen Zeitpunkte (ISO 8601, UTC).`,
      `- Die CSV-Dateien öffnest du direkt mit Excel oder Numbers (UTF-8, Semikolon als Trenner).`,
      `- Nicht enthalten sind Probe-Sitzungen und die im Chat geteilten Dateien selbst; deren Namen stehen im Chat-Verlauf.`,
      ``,
    ].join('\r\n');

    const files: Zippable = {
      'LIESMICH.txt': strToU8(readme),
      'klienten.csv': strToU8(clientsCsv),
      'termine.csv': strToU8(bookingsCsv),
      'daten.json': strToU8(JSON.stringify(data, null, 2)),
    };
    if (Object.keys(notesFiles).length) files.notizen = notesFiles;
    if (Object.keys(chatFiles).length) files.chat = chatFiles;

    const zip = zipSync(files, { level: 6, mtime: now });
    // Nur ID und Größe: Namen und Inhalte gehören nicht ins Log.
    this.logger.log(`Data export for organization ${organizationId}: ${bookingRows.length} booking(s), ${zip.byteLength} bytes`);

    return { fileName: `hxroom-export-${org?.slug ?? 'coach'}-${day}.zip`, zip };
  }
}
