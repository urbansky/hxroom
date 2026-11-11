import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentOrganization } from '../auth/current-organization.decorator';
import { CurrentUser, type SessionUser } from '../auth/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { assignBookingClientSchema, cancelBookingSchema, checkManualBookingSchema, createAdHocBookingSchema, createManualBookingSchema, listCoachBookingsQuerySchema, type AssignBookingClientDto, type CancelBookingDto, type CheckManualBookingDto, type CreateAdHocBookingDto, type CreateManualBookingDto, type ListCoachBookingsQuery } from '@hxroom/shared';
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

  // Terminseite (technisches-konzept.md §5): Sie muss auch nach dem Neuladen und über den
  // Link der Abschlusskarte stehen, ohne die Terminliste zu laden. Nur ein Segment – die
  // Unterpfade (`:id/cancel`, `:id/notes`, `:id/call`, …) bleiben davon unberührt.
  @Get(':id')
  findOne(
    @CurrentOrganization() org: { id: string } | undefined,
    @Param('id') id: string,
  ) {
    if (!org) throw new UnauthorizedException('No active organization');
    return this.coachBookingsService.findOne(org.id, id);
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

  // Manuell angelegte Termine, einzeln oder als Serie (doc/produkt/funktionen/manuelle-termine.md).
  @Post('manual')
  createManual(
    @CurrentOrganization() org: { id: string } | undefined,
    @Body(new ZodValidationPipe(createManualBookingSchema)) dto: CreateManualBookingDto,
  ) {
    if (!org) throw new UnauthorizedException('No active organization');
    return this.coachBookingsService.createManual(org.id, dto);
  }

  // Hinweise vor dem Anlegen; legt nichts an, deshalb 200 statt 201.
  @Post('manual/check')
  @HttpCode(HttpStatus.OK)
  checkManual(
    @CurrentOrganization() org: { id: string } | undefined,
    @Body(new ZodValidationPipe(checkManualBookingSchema)) dto: CheckManualBookingDto,
  ) {
    if (!org) throw new UnauthorizedException('No active organization');
    return this.coachBookingsService.checkManual(org.id, dto);
  }

  // Probe-Sitzung des Coachs mit sich selbst (Schritt 6a). Ebenfalls vor ':id/cancel'.
  @Post('test-session')
  createTestSession(
    @CurrentOrganization() org: { id: string } | undefined,
    @CurrentUser() user: SessionUser | undefined,
  ) {
    if (!org || !user) throw new UnauthorizedException('No active organization');
    return this.coachBookingsService.createTestSession(org.id, { name: user.name, email: user.email });
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

  // Endgültig löschen, samt Notizen, Chat und Dateien. Anstehende Termine ergeben 409 –
  // sie werden zuerst abgesagt.
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentOrganization() org: { id: string } | undefined,
    @Param('id') id: string,
  ) {
    if (!org) throw new UnauthorizedException('No active organization');
    return this.coachBookingsService.delete(org.id, id);
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
