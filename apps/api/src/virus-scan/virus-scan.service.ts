import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createConnection } from 'node:net';
import { PING_COMMAND, instreamFrames, parseClamdReply } from './clamd-protocol';

/** Wie lange der Aufbau der Verbindung dauern darf. */
const CONNECT_TIMEOUT_MS = 3_000;
/** Wie lange ein Scan dauern darf – eine Datei mit 25 MB braucht meist ein, zwei Sekunden. */
const SCAN_TIMEOUT_MS = 30_000;

export type ScanResult =
  | { status: 'clean' }
  | { status: 'infected'; signature: string }
  /**
   * Nicht geprüft. `disabled`: Es ist kein Scanner eingerichtet (lokal der Normalfall).
   * `unavailable`: Er ist eingerichtet, aber nicht erreichbar oder meldet einen Fehler.
   */
  | { status: 'skipped'; reason: 'disabled' | 'unavailable' };

/**
 * Virenscan über clamd (doc/videocall-umsetzungsplan.md, Nachtrag „Virenscan geteilter
 * Dateien").
 *
 * Ohne `CLAMAV_HOST` wird nicht geprüft – so läuft die Entwicklung ohne den gut 1 GB großen
 * Scanner. Ist er eingerichtet, aber nicht erreichbar, geht die Datei trotzdem durch und das
 * wird geloggt: Teilen soll im Gespräch nicht an einem Neustart von ClamAV scheitern
 * (entschieden 2026-09-28). Wie das Ergebnis verwendet wird, entscheidet der Aufrufer.
 */
@Injectable()
export class VirusScanService implements OnModuleInit {
  private readonly logger = new Logger(VirusScanService.name);
  private readonly host: string | null;
  private readonly port: number;

  constructor(private readonly config: ConfigService) {
    this.host = config.get<string>('CLAMAV_HOST')?.trim() || null;
    this.port = Number(config.get<string>('CLAMAV_PORT') ?? 3310);
  }

  async onModuleInit(): Promise<void> {
    if (!this.host) {
      const message = 'Virenscan aus (CLAMAV_HOST nicht gesetzt) – geteilte Dateien werden nicht geprüft';
      // Im Betrieb ein Fehler, der auffallen soll; lokal der gewollte Normalfall.
      if (this.config.get<string>('NODE_ENV') === 'production') this.logger.error(`❌ ${message}`);
      else this.logger.log(message);
      return;
    }

    try {
      const reply = await this.request([PING_COMMAND], CONNECT_TIMEOUT_MS);
      if (reply.replace(/\0/g, '').trim() === 'PONG') {
        this.logger.log(`✅ Virenscan aktiv (${this.host}:${this.port})`);
      } else {
        this.logger.warn(`⚠️ ClamAV antwortet unerwartet auf PING (${this.host}:${this.port})`);
      }
    } catch {
      // Beim ersten Start lädt ClamAV minutenlang Signaturen – bis dahin ist das normal.
      this.logger.warn(`⚠️ ClamAV noch nicht erreichbar (${this.host}:${this.port}) – Dateien gehen bis dahin ungeprüft durch`);
    }
  }

  async scan(data: Buffer): Promise<ScanResult> {
    if (!this.host) return { status: 'skipped', reason: 'disabled' };

    let reply: string;
    try {
      reply = await this.request(instreamFrames(data), SCAN_TIMEOUT_MS);
    } catch {
      return { status: 'skipped', reason: 'unavailable' };
    }

    const verdict = parseClamdReply(reply);
    if (verdict.status === 'error') {
      // Die Antwort von clamd enthält weder Dateinamen noch Inhalt.
      this.logger.warn(`ClamAV meldet einen Fehler: ${verdict.reply}`);
      return { status: 'skipped', reason: 'unavailable' };
    }
    return verdict;
  }

  /**
   * Ein Befehl, eine Antwort: clamd schließt die Verbindung nach der Antwort. Die Zeitgrenze
   * gilt bis zum Verbindungsaufbau mit CONNECT_TIMEOUT_MS, danach für den Rest mit `timeoutMs`.
   */
  private request(frames: Buffer[], timeoutMs: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const socket = createConnection({ host: this.host!, port: this.port });
      const received: Buffer[] = [];
      let settled = false;

      const finish = (error: Error | null) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        socket.destroy();
        // Hat clamd schon geantwortet (etwa „size limit exceeded") und dann die Verbindung
        // geschlossen, während noch gesendet wurde, zählt die Antwort, nicht der Schreibfehler.
        if (received.length) resolve(Buffer.concat(received).toString());
        else reject(error ?? new Error('Empty reply from clamd'));
      };

      let timer = setTimeout(() => finish(new Error('clamd connect timeout')), CONNECT_TIMEOUT_MS);

      socket.on('connect', () => {
        clearTimeout(timer);
        timer = setTimeout(() => finish(new Error('clamd timeout')), timeoutMs);
        for (const frame of frames) socket.write(frame);
      });
      socket.on('data', (chunk: Buffer) => received.push(chunk));
      socket.on('end', () => finish(null));
      socket.on('close', () => finish(null));
      socket.on('error', (err) => finish(err));
    });
  }
}
