import { Global, Inject, Injectable, Logger, Module, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RoomServiceClient } from 'livekit-server-sdk';
import { LIVEKIT_ROOM_SERVICE } from './livekit.tokens';

export { LIVEKIT_ROOM_SERVICE };

// Der server-zu-server-Zugang zu LiveKit, nach dem Muster von DbModule und S3Module: ein
// Client als Provider plus ein Health-Check beim Start.
//
// Die Token-Ausgabe an den Browser liegt weiterhin in call/livekit-token.ts und kommt ohne
// diesen Client aus – ein Access-Token wird lokal signiert, ohne den Server zu fragen. Der
// RoomServiceClient ist der andere Weg: Aufrufe *an* LiveKit, mit Admin-Grants. Ihn braucht
// B6, um eine Sitzung serverseitig zu beenden.

@Injectable()
class LivekitHealthService implements OnModuleInit {
  private readonly logger = new Logger(LivekitHealthService.name);

  constructor(
    @Inject(LIVEKIT_ROOM_SERVICE) private readonly rooms: RoomServiceClient,
    // Explizit statt über den Typ: Auf design:paramtypes ist kein Verlass, esbuild-basierte
    // Läufe (tsx) emittieren die Metadaten nicht.
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    const host = this.config.getOrThrow<string>('LIVEKIT_HOST');

    // listRooms ist das Gegenstück zu HeadBucket: ein billiger, signierter Aufruf, der
    // nichts verändert. Er belegt dreierlei in einem Schritt – LIVEKIT_HOST ist erreichbar,
    // Key und Secret passen zueinander, und der Key ist auf dem Server eingetragen. Ein
    // falsches Secret fällt sonst erst auf, wenn ein Klient im Call landet und LiveKit
    // seinen Token ablehnt.
    try {
      const rooms = await this.rooms.listRooms();
      this.logger.log(`✅ LiveKit-Verbindung erfolgreich (${host}, ${rooms.length} offene Räume)`);
    } catch (err) {
      this.logger.error(`❌ LiveKit-Verbindung fehlgeschlagen (${host})`, err);
    }

    // LIVEKIT_URL ist der Weg des *Browsers* und führt über Caddy, nicht über LIVEKIT_HOST.
    // Die API kann ihn nicht sinnvoll prüfen – ein grüner Check oben beweist also nicht, dass
    // der Client den Server erreicht. Wenigstens die Form ist prüfbar, und ein hier falsch
    // gesetztes Schema ist ein Fehler, der sonst erst im Browser sichtbar wird.
    const url = this.config.getOrThrow<string>('LIVEKIT_URL');
    if (!url.startsWith('ws://') && !url.startsWith('wss://')) {
      this.logger.warn(
        `⚠️  LIVEKIT_URL ist kein WebSocket-URL: "${url}" – erwartet wird ws:// oder wss://`,
      );
    }
  }
}

@Global()
@Module({
  providers: [
    {
      provide: LIVEKIT_ROOM_SERVICE,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new RoomServiceClient(
          // LIVEKIT_HOST, nicht LIVEKIT_URL: Die Twirp-API spricht HTTP, nicht WebSocket.
          config.getOrThrow<string>('LIVEKIT_HOST'),
          config.getOrThrow<string>('LIVEKIT_API_KEY'),
          config.getOrThrow<string>('LIVEKIT_API_SECRET'),
        ),
    },
    LivekitHealthService,
  ],
  exports: [LIVEKIT_ROOM_SERVICE],
})
export class LivekitModule {}
