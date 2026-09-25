import { Body, Controller, Headers, HttpCode, HttpStatus, Inject, Logger, Post, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WebhookReceiver } from 'livekit-server-sdk';
import { CallPresenceService } from './call-presence.service';

/**
 * Webhooks von LiveKit (doc/videocall-umsetzungsplan.md B6).
 *
 * Ohne AuthGuard – der Aufrufer ist der Medienserver, kein Mensch. Sein Ausweis ist die
 * Signatur: LiveKit schickt im Authorization-Header ein mit dem API-Schlüssel signiertes JWT,
 * das die SHA-256-Summe des Bodys trägt. `WebhookReceiver` prüft beides; was nicht passt,
 * wird abgewiesen, bevor es irgendetwas bewirkt.
 *
 * Der Body kommt deshalb unverändert an (express.raw in main.ts): Die Summe gilt für die
 * Bytes, wie LiveKit sie geschickt hat, nicht für ein neu serialisiertes JSON.
 *
 * Der Weg ist intern – im Betrieb ruft LiveKit die API über das Docker-Netz, nicht über
 * Caddy. Die Signaturprüfung bleibt trotzdem: Wer den Endpunkt erreicht, soll ohne
 * Schlüssel keine Sitzung beenden können.
 */
@Controller('livekit')
export class LivekitWebhookController {
  private readonly logger = new Logger(LivekitWebhookController.name);
  private readonly receiver: WebhookReceiver;

  constructor(
    private readonly presence: CallPresenceService,
    @Inject(ConfigService) config: ConfigService,
  ) {
    this.receiver = new WebhookReceiver(
      config.getOrThrow<string>('LIVEKIT_API_KEY'),
      config.getOrThrow<string>('LIVEKIT_API_SECRET'),
    );
  }

  @Post('webhooks')
  @HttpCode(HttpStatus.NO_CONTENT)
  async receive(
    @Body() body: Buffer | undefined,
    @Headers('authorization') authorization: string | undefined,
  ): Promise<void> {
    let event;
    try {
      event = await this.receiver.receive(Buffer.isBuffer(body) ? body.toString('utf8') : '', authorization);
    } catch {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    // Ein Fehler hier soll LiveKit nicht zu endlosen Wiederholungen bringen: Der Lauf in
    // CallPresenceService prüft den Raum ohnehin selbst, bevor er eine Sitzung beendet.
    try {
      await this.presence.handle({
        event: event.event,
        room: event.room ? { name: event.room.name } : undefined,
        participant: event.participant ? { identity: event.participant.identity } : undefined,
      });
    } catch (err) {
      this.logger.error(`Webhook ${event.event} nicht verarbeitet`, err);
    }
  }
}
