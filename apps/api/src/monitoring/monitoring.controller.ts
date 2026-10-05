import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus,
  Inject,
  Logger,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { scrubSensitiveText } from '@hxroom/shared';
import { AdminGuard } from '../auth/admin.guard';
import { MinuteRateLimiter, parseAllowedDsns, resolveTunnelTarget } from './monitoring-tunnel';

@Controller('monitoring')
export class MonitoringController {
  private readonly logger = new Logger(MonitoringController.name);
  private readonly allowed: ReturnType<typeof parseAllowedDsns>;
  // Je Absender 60 Umschläge pro Minute, insgesamt 1200 – eine Fehlerschleife in einem Browser
  // soll weder GlitchTip noch die API fluten.
  private readonly perClient = new MinuteRateLimiter(60);
  private readonly overall = new MinuteRateLimiter(1200);

  constructor(@Inject(ConfigService) config: ConfigService) {
    this.allowed = parseAllowedDsns(config.get<string>('SENTRY_TUNNEL_DSNS'));
  }

  /**
   * Tunnel für die Browser. Ohne Guard: Die Klientenseite hat keine Session. Schutz sind die
   * Projektliste und die Mengenbegrenzung. Der Body kommt als Text (main.ts, Body-Parser).
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  async tunnel(
    @Body() body: unknown,
    @Headers('x-forwarded-for') forwardedFor: string | undefined,
  ): Promise<void> {
    if (typeof body !== 'string' || body.length === 0) {
      throw new BadRequestException('Invalid envelope');
    }
    const target = resolveTunnelTarget(body, this.allowed);
    if (!target) throw new ForbiddenException('Unknown monitoring project');

    // Caddy setzt den Header selbst und überschreibt, was ein Browser mitschickt – der Schlüssel
    // ist also die echte Adresse, eine erfundene umgeht die Grenze nicht. Nur im Speicher, nie im Log.
    const client = forwardedFor?.split(',')[0]?.trim() || 'unknown';
    if (!this.perClient.allow(client) || !this.overall.allow('all')) {
      throw new HttpException('Too many monitoring events', HttpStatus.TOO_MANY_REQUESTS);
    }

    let response: Response;
    try {
      response = await fetch(target.url, {
        method: 'POST',
        headers: { 'content-type': 'application/x-sentry-envelope' },
        body: scrubSensitiveText(body),
        signal: AbortSignal.timeout(10_000),
      });
    } catch (cause) {
      this.logger.warn(`Monitoring-Tunnel: GlitchTip nicht erreichbar (Projekt ${target.projectId})`);
      throw new HttpException('Monitoring backend unreachable', HttpStatus.BAD_GATEWAY, { cause });
    }
    if (response.status === 429) {
      throw new HttpException('Too many monitoring events', HttpStatus.TOO_MANY_REQUESTS);
    }
    if (!response.ok) {
      this.logger.warn(`Monitoring-Tunnel: GlitchTip antwortet ${response.status} (Projekt ${target.projectId})`);
      throw new HttpException('Monitoring backend rejected event', HttpStatus.BAD_GATEWAY);
    }
  }

  /**
   * Löst absichtlich einen unerwarteten Fehler aus – zur Abnahme und um im Betrieb jederzeit
   * prüfen zu können, dass Meldungen der API bei GlitchTip ankommen. Nur für Betreiber.
   */
  @Post('test-error')
  @UseGuards(AdminGuard)
  testError(): never {
    throw new Error('Monitoring test error (triggered by operator)');
  }
}
