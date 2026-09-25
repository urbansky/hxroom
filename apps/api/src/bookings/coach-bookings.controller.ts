import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentOrganization } from '../auth/current-organization.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { assignBookingClientSchema, cancelBookingSchema, createAdHocBookingSchema, listCoachBookingsQuerySchema, type AssignBookingClientDto, type CancelBookingDto, type CreateAdHocBookingDto, type ListCoachBookingsQuery } from '@hxroom/shared';
import { CoachBookingsService } from './coach-bookings.service';

// Kalender-Ansicht im Coach-Backoffice. Teilt sich den Pfad 'bookings' mit dem
// öffentlichen BookingConfirmationController (POST :id/confirm), überschneidet sich
// aber in keiner Route.
@Controller('bookings')
@UseGuards(AuthGuard)
export class CoachBookingsController {
  constructor(private readonly coachBookingsService: CoachBookingsService) {}

  @Get()
  list(
    @CurrentOrganization() org: { id: string } | undefined,
    @Query(new ZodValidationPipe(listCoachBookingsQuerySchema)) query: ListCoachBookingsQuery,
  ) {
    if (!org) throw new UnauthorizedException('No active organization');
    return this.coachBookingsService.list(org.id, query);
  }

  // Spontan-Termin: beginnt im Moment des Aufrufs. Steht vor ':id/cancel', damit die
  // feste Route nicht von einem Pfadparameter verdeckt werden kann.
  @Post('ad-hoc')
  createAdHoc(
    @CurrentOrganization() org: { id: string } | undefined,
    @Body(new ZodValidationPipe(createAdHocBookingSchema)) dto: CreateAdHocBookingDto,
  ) {
    if (!org) throw new UnauthorizedException('No active organization');
    return this.coachBookingsService.createAdHoc(org.id, dto);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  cancel(
    @CurrentOrganization() org: { id: string } | undefined,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(cancelBookingSchema)) dto: CancelBookingDto,
  ) {
    if (!org) throw new UnauthorizedException('No active organization');
    return this.coachBookingsService.cancel(org.id, id, dto);
  }

  // Nicht erschienen (B6). Eine Unterressource statt eines Status-Patches: Der Übergang hat
  // eigene Regeln (begonnen, bestätigt, kein Einlass), und das Gegenstück ist ein DELETE.
  @Post(':id/no-show')
  @HttpCode(HttpStatus.OK)
  markNoShow(
    @CurrentOrganization() org: { id: string } | undefined,
    @Param('id') id: string,
  ) {
    if (!org) throw new UnauthorizedException('No active organization');
    return this.coachBookingsService.markNoShow(org.id, id);
  }

  @Delete(':id/no-show')
  undoNoShow(
    @CurrentOrganization() org: { id: string } | undefined,
    @Param('id') id: string,
  ) {
    if (!org) throw new UnauthorizedException('No active organization');
    return this.coachBookingsService.undoNoShow(org.id, id);
  }

  // Zuordnung zu einem Klienten – liegt hier und nicht im ClientsController, weil die
  // Buchung das geänderte Objekt ist.
  @Patch(':id/client')
  assignClient(
    @CurrentOrganization() org: { id: string } | undefined,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(assignBookingClientSchema)) dto: AssignBookingClientDto,
  ) {
    if (!org) throw new UnauthorizedException('No active organization');
    return this.coachBookingsService.assignClient(org.id, id, dto);
  }

  // Antwort bewusst selbst schreiben statt über @Header-Decorator: Nest würde den
  // zurückgegebenen String sonst als JSON-Body behandeln und bei jedem Abruf
  // "Content-Type doesn't match Reply body" warnen.
  @Get(':id/calendar.ics')
  async ics(
    @CurrentOrganization() org: { id: string } | undefined,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    if (!org) throw new UnauthorizedException('No active organization');
    const ics = await this.coachBookingsService.buildIcs(org.id, id);

    res
      .type('text/calendar; charset=utf-8')
      .set('Content-Disposition', 'attachment; filename="termin.ics"')
      .send(ics);
  }
}
