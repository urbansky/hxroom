import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, count, eq, gt } from 'drizzle-orm';
import {
  CALL_FILES_PER_BOOKING_LIMIT,
  CALL_MESSAGES_PER_BOOKING_LIMIT,
} from '@hxroom/shared';
import { DRIZZLE, type DrizzleDb } from '../db/db.module';
import { bookings, sessionChatFiles, sessionChatMessages } from '../db/schema';
import { S3Service } from '../storage/s3.service';
import { sessionAttachmentKey, sessionAttachmentPreviewKey } from '../storage/paths';
import { createImagePreview, stripImageMetadata } from '../storage/image-transcode.util';
import { mayReachRoom, resolveCallState } from './call-access';
import { detectCallFileType, safeFileName } from './call-file-type';
import { CallEventsService } from './call-events.service';
import { CallService } from './call.service';
import type {
  CallChatMessageResponse,
  CallChatMessagesResponse,
  CallChatSender,
  SendCallFileDto,
  SendCallMessageDto,
} from '@hxroom/shared';
import type {
  bookings as bookingsTable,
  sessionChatFiles as filesTable,
  sessionChatMessages as messagesTable,
} from '../db/schema';

type BookingRow = typeof bookingsTable.$inferSelect;
type MessageRow = typeof messagesTable.$inferSelect;
type FileRow = typeof filesTable.$inferSelect;
/** Die Transaktion, die `db.transaction` hereinreicht. */
type ChatTx = Parameters<Parameters<DrizzleDb['transaction']>[0]>[0];

/** Das Original oder das kleine Vorschaubild eines Bildes. */
export type FileVariant = 'original' | 'preview';

/** Der signierte Link samt der Cache-Angabe für die Weiterleitung dorthin. */
export interface SignedFileUrl {
  url: string;
  /** Für die 302-Antwort der API: Bilder dürfen im Browser liegen bleiben, Dokumente nicht. */
  cacheControl: string;
}

/** Wie lange ein Download-Link gilt (doc/s3-verzeichnisschema.md). */
const DOWNLOAD_URL_TTL_SECONDS = 15 * 60;

/**
 * Wie lange ein Bild im Browser liegen bleiben darf – und zugleich die Spanne, über die die
 * Signatur gleich bleibt (siehe `signedUrlFor`). Der Tab-Wechsel der Seitenleiste baut den
 * Chat jedes Mal neu auf; ohne Cache lüden alle Vorschaubilder jedes Mal erneut, mitten im
 * Videocall.
 */
const IMAGE_CACHE_SECONDS = 10 * 60;

/**
 * Was der Browser mit einer Datei tun soll. Bilder und PDFs zeigt er an – Bilder in der
 * Großansicht, PDFs im eigenen Viewer in einem neuen Tab. Office-Dokumente kann er nicht
 * darstellen; die lädt er herunter.
 *
 * `inline` ist hier vertretbar, weil nur geprüfte Typen im Speicher liegen: Die Signatur
 * stimmt mit der Endung überein, Bilder hat sharp zusätzlich neu kodiert, und SVG ist nicht
 * erlaubt. Eine HTML-Datei, die sich als Bild ausgibt, gibt es dort nicht.
 */
function dispositionFor(mimeType: string): 'inline' | 'attachment' {
  return mimeType.startsWith('image/') || mimeType === 'application/pdf' ? 'inline' : 'attachment';
}

function toResponse(row: MessageRow, file?: FileRow | null): CallChatMessageResponse {
  return {
    id:              row.id,
    seq:             Number(row.seq),
    sender:          row.sender,
    text:            row.text,
    createdAt:       row.createdAt.toISOString(),
    clientMessageId: row.clientMessageId,
    file: file
      ? {
          id:       file.id,
          name:     file.fileName,
          mimeType: file.mimeType,
          size:     file.sizeBytes,
          preview:  file.previewWidth && file.previewHeight
            ? { width: file.previewWidth, height: file.previewHeight }
            : null,
        }
      : null,
  };
}

/**
 * Chat einer Sitzung (doc/videocall-umsetzungsplan.md B7).
 *
 * Der Weg einer Nachricht führt über die API und nicht über den LiveKit-Datenkanal: Läge das
 * Speichern beim Browser des Senders, gäbe es Nachrichten, die ankommen, aber nirgends
 * liegen – und umgekehrt. Zugestellt wird über den Ereigniskanal, den beide Seiten während
 * des Gesprächs ohnehin offen halten; das Ereignis trägt keinen Inhalt, jede Seite holt sich
 * die neuen Nachrichten mit ihrem eigenen Ausweis.
 *
 * Die Mandantengrenze wird nicht neu geprüft, sondern von `CallService` übernommen
 * (`findOwn` für den Coach, `loadForClient` für den Token des Klienten).
 *
 * Der Inhalt wird nie geloggt – wie bei den Notizen.
 */
@Injectable()
export class CallChatService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly callService: CallService,
    private readonly events: CallEventsService,
    private readonly s3: S3Service,
  ) {}

  // --- Coach: Ausweis ist die Session, die Grenze die organizationId ---

  async listForCoach(organizationId: string, bookingId: string, after?: number): Promise<CallChatMessagesResponse> {
    const booking = await this.callService.findOwn(organizationId, bookingId);
    return this.list(booking.id, after);
  }

  async sendAsCoach(
    organizationId: string,
    userId: string,
    bookingId: string,
    dto: SendCallMessageDto,
  ): Promise<CallChatMessageResponse> {
    const booking = await this.callService.findOwn(organizationId, bookingId);
    return this.send(booking, 'coach', userId, dto);
  }

  // --- Klient: Ausweis ist der Token aus dem Mail-Link ---

  /**
   * Der Klient darf lesen, solange sein Zugang gilt. Nach dem Ende der Sitzung ist der Raum
   * für ihn zu – der Verlauf bleibt dem Coach, für den er gespeichert wurde.
   */
  async listForClient(bookingId: string, token: string, after?: number): Promise<CallChatMessagesResponse> {
    const booking = await this.callService.loadForClient(bookingId, token);
    if (!mayReachRoom(resolveCallState(booking, new Date()))) {
      throw new ConflictException('Session is not open');
    }
    return this.list(booking.id, after);
  }

  async sendAsClient(bookingId: string, token: string, dto: SendCallMessageDto): Promise<CallChatMessageResponse> {
    const booking = await this.callService.loadForClient(bookingId, token);
    return this.send(booking, 'client', null, dto);
  }

  // --- Dateien ---

  async sendFileAsCoach(
    organizationId: string,
    userId: string,
    bookingId: string,
    dto: SendCallFileDto,
    file: Express.Multer.File,
  ): Promise<CallChatMessageResponse> {
    const booking = await this.callService.findOwn(organizationId, bookingId);
    return this.sendFile(booking, 'coach', userId, dto, file);
  }

  async sendFileAsClient(
    bookingId: string,
    token: string,
    dto: SendCallFileDto,
    file: Express.Multer.File,
  ): Promise<CallChatMessageResponse> {
    const booking = await this.callService.loadForClient(bookingId, token);
    return this.sendFile(booking, 'client', null, dto, file);
  }

  /**
   * Der signierte Link auf eine Datei oder ihr Vorschaubild. Der Coach darf jederzeit, der
   * Klient nur, solange sein Zugang gilt – dieselbe Regel wie beim Lesen des Verlaufs.
   *
   * Geprüft wird beim Abruf und nicht beim Anzeigen des Verlaufs: So steht im Chat eine
   * Adresse, die auch morgen noch funktioniert, und der signierte Link entsteht erst in dem
   * Moment, in dem jemand ihn tatsächlich braucht.
   */
  async fileUrlForCoach(
    organizationId: string,
    bookingId: string,
    fileId: string,
    variant: FileVariant,
  ): Promise<SignedFileUrl> {
    const booking = await this.callService.findOwn(organizationId, bookingId);
    return this.signedUrlFor(booking.id, fileId, variant);
  }

  async fileUrlForClient(bookingId: string, token: string, fileId: string, variant: FileVariant): Promise<SignedFileUrl> {
    const booking = await this.callService.loadForClient(bookingId, token);
    if (!mayReachRoom(resolveCallState(booking, new Date()))) {
      throw new ConflictException('Session is not open');
    }
    return this.signedUrlFor(booking.id, fileId, variant);
  }

  // --- intern ---

  /**
   * Der Verlauf, aufsteigend. `after` ist die Nummer der letzten bekannten Nachricht: Auf ein
   * Chatereignis hin fragt die Oberfläche damit nur nach, was sie noch nicht hat, und nach
   * einem Verbindungsabbruch holt derselbe Aufruf alles Verpasste nach.
   */
  private async list(bookingId: string, after?: number): Promise<CallChatMessagesResponse> {
    const rows = await this.db
      .select({ message: sessionChatMessages, file: sessionChatFiles })
      .from(sessionChatMessages)
      .leftJoin(sessionChatFiles, eq(sessionChatFiles.messageId, sessionChatMessages.id))
      .where(
        after === undefined
          ? eq(sessionChatMessages.bookingId, bookingId)
          : and(eq(sessionChatMessages.bookingId, bookingId), gt(sessionChatMessages.seq, after)),
      )
      .orderBy(asc(sessionChatMessages.seq));

    return { messages: rows.map((row) => toResponse(row.message, row.file)) };
  }

  /**
   * Geschrieben wird nur im laufenden Gespräch: Der Chat ist die Rückfallebene *im* Call
   * (project.md §5a), nicht ein Postfach für die Zeit davor oder danach. Vor dem Einlass
   * gibt es den Warteraum, nach dem Ende ist die Sitzung abgeschlossen.
   */
  private async send(
    booking: BookingRow,
    sender: CallChatSender,
    senderUserId: string | null,
    dto: SendCallMessageDto,
  ): Promise<CallChatMessageResponse> {
    if (resolveCallState(booking, new Date()) !== 'admitted') {
      throw new ConflictException('Chat is only available during the session');
    }

    // Wiederholbar: Derselbe clientMessageId trifft auf den Unique-Schlüssel, und statt einer
    // zweiten Zeile kommt die vorhandene zurück. Ein Netzfehler nach dem Schreiben – die
    // Antwort geht verloren, die Nachricht liegt schon – ist damit unschädlich.
    const inserted = await this.db.transaction(async (tx) => {
      await this.lockChat(tx, booking.id);

      const [{ value: existing }] = await tx
        .select({ value: count() })
        .from(sessionChatMessages)
        .where(eq(sessionChatMessages.bookingId, booking.id));

      if (existing >= CALL_MESSAGES_PER_BOOKING_LIMIT) {
        throw new BadRequestException('Message limit for this session reached');
      }

      const [row] = await tx
        .insert(sessionChatMessages)
        .values({
          organizationId:  booking.organizationId,
          bookingId:       booking.id,
          sender,
          senderUserId,
          clientMessageId: dto.clientMessageId,
          text:            dto.text,
        })
        .onConflictDoNothing({ target: [sessionChatMessages.bookingId, sessionChatMessages.clientMessageId] })
        .returning();
      return row;
    });

    if (!inserted) return this.findByClientMessageId(booking.id, dto.clientMessageId);

    this.events.notifyChat(booking.id);
    return toResponse(inserted);
  }

  private async findByClientMessageId(bookingId: string, clientMessageId: string): Promise<CallChatMessageResponse> {
    const [row] = await this.db
      .select({ message: sessionChatMessages, file: sessionChatFiles })
      .from(sessionChatMessages)
      .leftJoin(sessionChatFiles, eq(sessionChatFiles.messageId, sessionChatMessages.id))
      .where(
        and(
          eq(sessionChatMessages.bookingId, bookingId),
          eq(sessionChatMessages.clientMessageId, clientMessageId),
        ),
      )
      .limit(1);

    // Kann nur fehlen, wenn zwischen Konflikt und Abfrage gelöscht wurde – heute gibt es
    // keinen Weg, eine einzelne Nachricht zu löschen.
    if (!row) throw new ConflictException('Message could not be stored');
    return toResponse(row.message, row.file);
  }

  /**
   * Eine Datei teilen: prüfen, ablegen, dann die Nachricht schreiben.
   *
   * Geprüft werden Endung **und** Signatur, und gespeichert wird der so ermittelte Typ – der
   * gemeldete kommt vom Browser des Absenders. Bilder werden dabei neu kodiert und verlieren
   * ihre Metadaten; ein Handyfoto trägt sonst den Aufnahmeort des Klienten.
   *
   * Hochgeladen wird über die API und nicht direkt in den Speicher: Sonst läge die Datei
   * schon im Bucket, bevor irgendetwas davon geprüft ist.
   */
  private async sendFile(
    booking: BookingRow,
    sender: CallChatSender,
    senderUserId: string | null,
    dto: SendCallFileDto,
    file: Express.Multer.File,
  ): Promise<CallChatMessageResponse> {
    if (resolveCallState(booking, new Date()) !== 'admitted') {
      throw new ConflictException('Chat is only available during the session');
    }

    // Vorab, damit niemand 25 MB umsonst verarbeiten lässt. Verbindlich geprüft wird die
    // Grenze noch einmal unter der Sperre unten – zwei gleichzeitige Uploads könnten sie
    // sonst gemeinsam um eins überschreiten.
    if ((await this.countFiles(this.db, booking.id)) >= CALL_FILES_PER_BOOKING_LIMIT) {
      throw new BadRequestException('File limit for this session reached');
    }

    const type = detectCallFileType(file.originalname, file.buffer);
    if (!type) {
      throw new BadRequestException('Unsupported file type');
    }

    let body = file.buffer;
    let preview: { body: Buffer; width: number; height: number } | null = null;
    if (type.isImage) {
      try {
        body = await stripImageMetadata(file.buffer, type.extension);
        // Aus dem bereinigten Bild, nicht aus dem Original: So trägt auch die Vorschau
        // garantiert keine Metadaten.
        preview = await createImagePreview(body);
      } catch {
        // Ein Bild, das sharp nicht lesen kann, ist keines – trotz passender Signatur.
        throw new BadRequestException('Image could not be processed');
      }
    }

    const fileId = crypto.randomUUID();
    const key = sessionAttachmentKey(booking.organizationId, booking.id, fileId, type.extension);
    const previewKey = sessionAttachmentPreviewKey(booking.organizationId, booking.id, fileId);
    await this.s3.putObject(key, body, type.mimeType);
    if (preview) await this.s3.putObject(previewKey, preview.body, 'image/webp');

    // Nachricht und Datei in einer Transaktion: Sichtbar werden beide im selben Moment. Vorher
    // standen das zwei getrennte Befehle, und wer genau dazwischen nachholte, bekam die
    // Nachricht ohne Datei – und schob seinen Zeiger darüber hinweg, sodass die Datei nie
    // nachkam. Im Stresstest traf das 24 von 180 Dateien.
    //
    // Das Hochladen in den Speicher liegt davor und außerhalb: Es dauert, und die Sperre auf
    // die Buchung soll nur die beiden kurzen Einträge umfassen.
    let result: { message: MessageRow; file: FileRow } | null;
    try {
      result = await this.db.transaction(async (tx) => {
        await this.lockChat(tx, booking.id);

        if ((await this.countFiles(tx, booking.id)) >= CALL_FILES_PER_BOOKING_LIMIT) {
          throw new BadRequestException('File limit for this session reached');
        }

        const [message] = await tx
          .insert(sessionChatMessages)
          .values({
            organizationId:  booking.organizationId,
            bookingId:       booking.id,
            sender,
            senderUserId,
            clientMessageId: dto.clientMessageId,
            text:            dto.text ?? '',
          })
          .onConflictDoNothing({ target: [sessionChatMessages.bookingId, sessionChatMessages.clientMessageId] })
          .returning();

        if (!message) return null;

        const [row] = await tx
          .insert(sessionChatFiles)
          .values({
            id:             fileId,
            messageId:      message.id,
            organizationId: booking.organizationId,
            bookingId:      booking.id,
            fileName:       safeFileName(file.originalname),
            mimeType:       type.mimeType,
            extension:      type.extension,
            sizeBytes:      body.length,
            previewWidth:   preview?.width ?? null,
            previewHeight:  preview?.height ?? null,
          })
          .returning();

        return { message, file: row };
      });
    } catch (err) {
      // Abgelehnt (etwa an der Grenze): Die schon abgelegten Objekte gehören zu nichts.
      await this.removeObjects(key, preview ? previewKey : null);
      throw err;
    }

    // Zweiter Versuch derselben Nachricht: Das eben abgelegte Objekt wird nicht gebraucht und
    // bliebe sonst als Waise im Speicher liegen.
    if (!result) {
      await this.removeObjects(key, preview ? previewKey : null);
      return this.findByClientMessageId(booking.id, dto.clientMessageId);
    }

    this.events.notifyChat(booking.id);
    return toResponse(result.message, result.file);
  }

  /**
   * Sperrt den Chat dieser Buchung für die Dauer der Transaktion.
   *
   * Der Empfänger holt nach mit „alles nach der höchsten Nummer, die ich habe". Das trägt nur,
   * wenn Nachrichten in der Reihenfolge ihrer Nummern sichtbar werden. Die Nummer vergibt die
   * Datenbank beim Einfügen, sichtbar wird die Zeile aber erst beim Abschluss – zwei
   * gleichzeitige Nachrichten könnten also als 11 vor 10 erscheinen, und wer dazwischen
   * nachholt, sähe 10 nie. Unter der Sperre auf die Buchungszeile wird je Sitzung eine
   * Nachricht nach der anderen vergeben und abgeschlossen; andere Sitzungen berührt das nicht.
   */
  private async lockChat(tx: ChatTx, bookingId: string): Promise<void> {
    await tx.select({ id: bookings.id }).from(bookings).where(eq(bookings.id, bookingId)).for('update');
  }

  private async countFiles(db: DrizzleDb | ChatTx, bookingId: string): Promise<number> {
    const [{ value }] = await db
      .select({ value: count() })
      .from(sessionChatFiles)
      .where(eq(sessionChatFiles.bookingId, bookingId));
    return value;
  }

  private async removeObjects(key: string, previewKey: string | null): Promise<void> {
    await this.s3.deleteObject(key).catch(() => undefined);
    if (previewKey) await this.s3.deleteObject(previewKey).catch(() => undefined);
  }

  /**
   * Signierter Link auf das Objekt dieser Datei – nur, wenn sie zu dieser Buchung gehört.
   *
   * **Bilder bekommen stabile Links.** Eine Signatur hängt am Zeitpunkt; jeder Abruf ergäbe
   * eine neue URL, und der Browser könnte nichts aus seinem Cache nehmen. Deshalb wird bei
   * Bildern auf den Beginn eines Zehn-Minuten-Fensters signiert: Innerhalb des Fensters
   * entsteht dieselbe URL, das Bild kommt aus dem Cache. Gültig bleibt sie 15 Minuten ab
   * Fensterbeginn, also mindestens fünf Minuten über das Fenster hinaus.
   *
   * Dokumente bekommen bei jedem Abruf einen frischen Link und `no-store` – sie werden
   * einmal geöffnet, nicht bei jedem Tab-Wechsel neu gezeigt.
   */
  private async signedUrlFor(bookingId: string, fileId: string, variant: FileVariant): Promise<SignedFileUrl> {
    const [file] = await this.db
      .select()
      .from(sessionChatFiles)
      .where(and(eq(sessionChatFiles.id, fileId), eq(sessionChatFiles.bookingId, bookingId)))
      .limit(1);

    // Eine fremde Datei ist hier nicht vorhanden, nicht verboten – wie eine fremde Buchung.
    if (!file) throw new NotFoundException('File not found');

    const hasPreview = !!file.previewWidth && !!file.previewHeight;
    if (variant === 'preview' && !hasPreview) throw new NotFoundException('Preview not found');

    const isImage = file.mimeType.startsWith('image/');
    if (!isImage) {
      const url = await this.s3.presignedDownloadUrl(
        sessionAttachmentKey(file.organizationId, file.bookingId, file.id, file.extension),
        {
          fileName:         file.fileName,
          contentType:      file.mimeType,
          expiresInSeconds: DOWNLOAD_URL_TTL_SECONDS,
          disposition:      dispositionFor(file.mimeType),
          cacheControl:     'private, no-store',
        },
      );
      return { url, cacheControl: 'private, no-store' };
    }

    const windowMs = IMAGE_CACHE_SECONDS * 1000;
    const signingDate = new Date(Math.floor(Date.now() / windowMs) * windowMs);
    const secondsLeftInWindow = Math.max(1, Math.round((signingDate.getTime() + windowMs - Date.now()) / 1000));

    const url = await this.s3.presignedDownloadUrl(
      variant === 'preview'
        ? sessionAttachmentPreviewKey(file.organizationId, file.bookingId, file.id)
        : sessionAttachmentKey(file.organizationId, file.bookingId, file.id, file.extension),
      {
        fileName:         file.fileName,
        contentType:      variant === 'preview' ? 'image/webp' : file.mimeType,
        expiresInSeconds: DOWNLOAD_URL_TTL_SECONDS,
        disposition:      'inline',
        // Das Objekt selbst darf so lange im Browser liegen, wie sein Link gilt.
        cacheControl:     `private, max-age=${IMAGE_CACHE_SECONDS}`,
        signingDate,
      },
    );

    // Die Weiterleitung höchstens bis zum Ende des Fensters – danach entsteht eine neue URL,
    // und eine länger gemerkte Weiterleitung zeigte auf eine bald ablaufende.
    return { url, cacheControl: `private, max-age=${secondsLeftInWindow}` };
  }
}
