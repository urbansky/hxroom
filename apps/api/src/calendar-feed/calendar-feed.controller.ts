import { Body, Controller, Delete, Get, Patch, Post, Query, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { updateCalendarFeedSchema, type UpdateCalendarFeedDto } from '@hxroom/shared';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentOrganization } from '../auth/current-organization.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CalendarFeedService } from './calendar-feed.service';

/** Einstellungen des Kalender-Abos für den angemeldeten Coach. */
@Controller('calendar-feed')
@UseGuards(AuthGuard)
export class CalendarFeedController {
  constructor(private readonly feed: CalendarFeedService) {}

  @Get()
  get(@CurrentOrganization() org: { id: string } | undefined) {
    if (!org) throw new UnauthorizedException('No active organization');
    return this.feed.get(org.id);
  }

  @Post()
  enable(@CurrentOrganization() org: { id: string } | undefined) {
    if (!org) throw new UnauthorizedException('No active organization');
    return this.feed.enable(org.id);
  }

  @Post('regenerate')
  regenerate(@CurrentOrganization() org: { id: string } | undefined) {
    if (!org) throw new UnauthorizedException('No active organization');
    return this.feed.regenerate(org.id);
  }

  @Patch()
  update(
    @CurrentOrganization() org: { id: string } | undefined,
    @Body(new ZodValidationPipe(updateCalendarFeedSchema)) dto: UpdateCalendarFeedDto,
  ) {
    if (!org) throw new UnauthorizedException('No active organization');
    return this.feed.setHideClientNames(org.id, dto.hideClientNames);
  }

  @Delete()
  disable(@CurrentOrganization() org: { id: string } | undefined) {
    if (!org) throw new UnauthorizedException('No active organization');
    return this.feed.disable(org.id);
  }
}

/**
 * Der Feed selbst – ohne Anmeldung, der Token ist das Zugangsdatum. Er steht im Query-String:
 * Das Request-Log schreibt nur den Pfad, die Fehlerüberwachung entfernt jeden Parameter, der auf
 * „token“ endet (packages/shared/src/monitoring.ts). Die Antwort wird selbst geschrieben, sonst
 * behandelte Nest den String als JSON-Body.
 */
@Controller()
export class CalendarFeedPublicController {
  constructor(private readonly feed: CalendarFeedService) {}

  @Get('calendar-feed.ics')
  async ics(@Query('token') token: string | undefined, @Res() res: Response) {
    const ics = await this.feed.render(typeof token === 'string' ? token : '');
    res
      .type('text/calendar; charset=utf-8')
      // Kalender sollen immer neu laden, Zwischenspeicher nichts aufheben – der Inhalt ist privat.
      .set('Cache-Control', 'private, no-cache')
      .set('Content-Disposition', 'inline; filename="hxroom.ics"')
      .send(ics);
  }
}
