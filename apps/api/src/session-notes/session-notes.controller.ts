import { Body, Controller, Get, Param, Put, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentOrganization } from '../auth/current-organization.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { sessionNoteSchema, type SessionNoteDto } from '@hxroom/shared';
import { SessionNotesService } from './session-notes.service';

/**
 * Notizen als Unterressource der Buchung: /bookings/:id/notes. PUT statt PATCH, weil der
 * Editor immer das ganze Dokument schickt.
 *
 * Nur für den Coach: Die Klientenseite hat keinen Weg hierher, ihr Ausweis ist der
 * Buchungstoken, und den nimmt dieser Controller nicht an.
 */
@Controller('bookings')
@UseGuards(AuthGuard)
export class SessionNotesController {
  constructor(private readonly sessionNotesService: SessionNotesService) {}

  @Get(':id/notes')
  find(
    @CurrentOrganization() org: { id: string } | undefined,
    @Param('id') id: string,
  ) {
    if (!org) throw new UnauthorizedException('No active organization');
    return this.sessionNotesService.find(org.id, id);
  }

  @Put(':id/notes')
  save(
    @CurrentOrganization() org: { id: string } | undefined,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(sessionNoteSchema)) dto: SessionNoteDto,
  ) {
    if (!org) throw new UnauthorizedException('No active organization');
    return this.sessionNotesService.save(org.id, id, dto);
  }
}
