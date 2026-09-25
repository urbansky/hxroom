import { Inject, Injectable } from '@nestjs/common';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { Readable } from 'node:stream';
import { S3, S3_BUCKET } from './s3.tokens';

/**
 * Der Ersatzname für `filename=` – dort ist nur ASCII zulässig. Der vollständige Name steht
 * daneben in `filename*`, das jeder aktuelle Browser bevorzugt.
 */
function asciiFallback(fileName: string): string {
  // eslint-disable-next-line no-control-regex
  const ascii = fileName.replace(/[^\u0020-\u007e]/g, '_').replace(/["\\]/g, '_');
  return ascii.trim() || 'download';
}

export interface S3Object {
  body: Readable;
  contentType?: string;
}

@Injectable()
export class S3Service {
  constructor(
    @Inject(S3) private readonly s3: S3Client,
    @Inject(S3_BUCKET) private readonly bucket: string,
  ) {}

  async putObject(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.s3.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }));
  }

  async getObject(key: string): Promise<S3Object> {
    const res = await this.s3.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    return { body: res.Body as Readable, contentType: res.ContentType };
  }

  async deleteObject(key: string): Promise<void> {
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  /**
   * Signierter Link auf ein Objekt, gültig für kurze Zeit
   * (doc/s3-verzeichnisschema.md, doc/videocall-umsetzungsplan.md B7).
   *
   * Die Antwort steht in der Signatur, nicht beim Speicher: Dateiname, der hier übergebene
   * geprüfte Typ, ob der Browser anzeigt (`inline`) oder herunterlädt (`attachment`), und
   * wie lange er die Antwort behalten darf. Auf dem Objektspeicher liegt die Datei unter
   * ihrer ID, ohne Namen und ohne Typ aus dem Upload.
   *
   * Der Bucket bleibt privat; nur dieser Link kommt hinein, und nur für die Dauer von
   * `expiresInSeconds`.
   */
  async presignedDownloadUrl(
    key: string,
    options: {
      fileName: string;
      contentType: string;
      expiresInSeconds: number;
      disposition: 'inline' | 'attachment';
      cacheControl: string;
      /** Signierzeitpunkt – für gleiche URLs bei wiederholtem Abruf, siehe CallChatService. */
      signingDate?: Date;
    },
  ): Promise<string> {
    return getSignedUrl(
      this.s3,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
        // Der Name wird zusätzlich als filename* (RFC 5987) gesetzt: Ohne das verliert ein
        // Name mit Umlauten seine Zeichen – beim Herunterladen wie beim Speichern aus dem
        // PDF-Viewer.
        ResponseContentDisposition:
          `${options.disposition}; filename="${asciiFallback(options.fileName)}"; `
          + `filename*=UTF-8''${encodeURIComponent(options.fileName)}`,
        ResponseContentType: options.contentType,
        ResponseCacheControl: options.cacheControl,
      }),
      { expiresIn: options.expiresInSeconds, signingDate: options.signingDate },
    );
  }

  /**
   * Löscht alle Objekte unterhalb eines Prefixes und gibt die Anzahl zurück.
   *
   * Gebraucht für die Kontolöschung: laut doc/s3-verzeichnisschema.md ist das oberste
   * Pfadsegment die Coach-ID, damit dort ein einziger Prefix-Delete genügt. Ein gezieltes
   * deleteObject(coachAvatarKey(...)) würde heute zwar reichen – es gibt aktuell nur den
   * Avatar –, wäre aber ab dem ersten weiteren Objekttyp stillschweigend unvollständig.
   *
   * Bewusst einzelne DeleteObject-Aufrufe statt DeleteObjects (Batch): der Batch-Endpunkt
   * ist bei RustFS, dem Dev-Backend laut doc/technisches-konzept.md §17, nicht zugesichert.
   * Bei einer Handvoll Objekten pro Coach ist der Unterschied bedeutungslos.
   */
  async deletePrefix(prefix: string): Promise<number> {
    let continuationToken: string | undefined;
    let deleted = 0;

    do {
      const listed = await this.s3.send(new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }));

      for (const object of listed.Contents ?? []) {
        if (!object.Key) continue;
        await this.deleteObject(object.Key);
        deleted++;
      }

      // IsTruncated statt NextContinuationToken prüfen: bei der letzten Seite fehlt das
      // Token, und eine Endlosschleife wäre hier besonders unangenehm.
      continuationToken = listed.IsTruncated ? listed.NextContinuationToken : undefined;
    } while (continuationToken);

    return deleted;
  }
}

export function isNoSuchKeyError(err: unknown): boolean {
  return (
    err instanceof Error &&
    (err.name === 'NoSuchKey' ||
      (err as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404)
  );
}
