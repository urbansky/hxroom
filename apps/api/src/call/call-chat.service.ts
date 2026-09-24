import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, count, eq, gt } from 'drizzle-orm';
import {
  CALL_FILES_PER_BOOKING_LIMIT,
  CALL_MESSAGES_PER_BOOKING_LIMIT,
} from '@hxroom/shared';
import { DRIZZLE, type DrizzleDb } from '../db/db.module';
import { sessionChatFiles, sessionChatMessages } from '../db/schema';
import { S3Service } from '../storage/s3.service';
import { sessionAttachmentKey } from '../storage/paths';
import { stripImageMetadata } from '../storage/image-transcode.util';
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

/** Wie lange ein Download-Link gilt (doc/s3-verzeichnisschema.md). */
const DOWNLOAD_URL_TTL_SECONDS = 15 * 60;

function toResponse(row: MessageRow, file?: FileRow | null): CallChatMessageResponse {
  return {
    id:              row.id,
    seq:             Number(row.seq),
    sender:          row.sender,
    text:            row.text,
    createdAt:       row.createdAt.toISOString(),
    clientMessageId: row.clientMessageId,
    file: file
      ? { id: file.id, name: file.fileName, mimeType: file.mimeType, size: file.sizeBytes }
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
   * Der Link zum Herunterladen, gültig für 15 Minuten. Der Coach darf jederzeit, der Klient
   * nur, solange sein Zugang gilt – dieselbe Regel wie beim Lesen des Verlaufs.
   *
   * Geprüft wird beim Klick und nicht beim Anzeigen des Verlaufs: So steht im Chat ein Link,
   * der auch morgen noch funktioniert, und der signierte kommt erst in dem Moment, in dem
   * jemand ihn tatsächlich braucht.
   */
  async downloadUrlForCoach(organizationId: string, bookingId: string, fileId: string): Promise<string> {
    const booking = await this.callService.findOwn(organizationId, bookingId);
    return this.downloadUrl(booking.id, fileId);
  }

  async downloadUrlForClient(bookingId: string, token: string, fileId: string): Promise<string> {
    const booking = await this.callService.loadForClient(bookingId, token);
    if (!mayReachRoom(resolveCallState(booking, new Date()))) {
      throw new ConflictException('Session is not open');
    }
    return this.downloadUrl(booking.id, fileId);
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

    const [{ value: existing }] = await this.db
      .select({ value: count() })
      .from(sessionChatMessages)
      .where(eq(sessionChatMessages.bookingId, booking.id));

    if (existing >= CALL_MESSAGES_PER_BOOKING_LIMIT) {
      throw new BadRequestException('Message limit for this session reached');
    }

    // Wiederholbar: Derselbe clientMessageId trifft auf den Unique-Schlüssel, und statt einer
    // zweiten Zeile kommt die vorhandene zurück. Ein Netzfehler nach dem Schreiben – die
    // Antwort geht verloren, die Nachricht liegt schon – ist damit unschädlich.
    const [inserted] = await this.db
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

    const [{ value: files }] = await this.db
      .select({ value: count() })
      .from(sessionChatFiles)
      .where(eq(sessionChatFiles.bookingId, booking.id));

    if (files >= CALL_FILES_PER_BOOKING_LIMIT) {
      throw new BadRequestException('File limit for this session reached');
    }

    const type = detectCallFileType(file.originalname, file.buffer);
    if (!type) {
      throw new BadRequestException('Unsupported file type');
    }

    let body = file.buffer;
    if (type.isImage) {
      try {
        body = await stripImageMetadata(file.buffer, type.extension);
      } catch {
        // Ein Bild, das sharp nicht lesen kann, ist keines – trotz passender Signatur.
        throw new BadRequestException('Image could not be processed');
      }
    }

    const fileId = crypto.randomUUID();
    const key = sessionAttachmentKey(booking.organizationId, booking.id, fileId, type.extension);
    await this.s3.putObject(key, body, type.mimeType);

    const [message] = await this.db
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

    // Zweiter Versuch derselben Nachricht: Das eben abgelegte Objekt wird nicht gebraucht und
    // bliebe sonst als Waise im Speicher liegen.
    if (!message) {
      await this.s3.deleteObject(key).catch(() => undefined);
      return this.findByClientMessageId(booking.id, dto.clientMessageId);
    }

    const [row] = await this.db
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
      })
      .returning();

    this.events.notifyChat(booking.id);
    return toResponse(message, row);
  }

  /** Signierter Link auf das Objekt dieser Datei – nur, wenn sie zu dieser Buchung gehört. */
  private async downloadUrl(bookingId: string, fileId: string): Promise<string> {
    const [file] = await this.db
      .select()
      .from(sessionChatFiles)
      .where(and(eq(sessionChatFiles.id, fileId), eq(sessionChatFiles.bookingId, bookingId)))
      .limit(1);

    // Eine fremde Datei ist hier nicht vorhanden, nicht verboten – wie eine fremde Buchung.
    if (!file) throw new NotFoundException('File not found');

    return this.s3.presignedDownloadUrl(
      sessionAttachmentKey(file.organizationId, file.bookingId, file.id, file.extension),
      {
        fileName: file.fileName,
        contentType: file.mimeType,
        expiresInSeconds: DOWNLOAD_URL_TTL_SECONDS,
      },
    );
  }
}
