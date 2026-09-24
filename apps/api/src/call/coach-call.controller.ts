import { BadRequestException, Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, Query, Redirect, Res, Sse, UnauthorizedException, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentOrganization } from '../auth/current-organization.decorator';
import { CurrentUser, type SessionUser } from '../auth/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  CALL_FILE_MAX_BYTES,
  sendCallFileSchema,
  sendCallMessageSchema,
  type SendCallFileDto,
  type SendCallMessageDto,
} from '@hxroom/shared';
import { CallService } from './call.service';
import { CallChatService } from './call-chat.service';
import { CallClientContextService } from './call-client-context.service';

/**
 * Call-Screen des Coachs (doc/videocall-umsetzungsplan.md A1). Zugriff über die
 * better-auth Session; welche Buchung er sehen darf, entscheidet allein seine
 * activeOrganizationId.
 *
 * Seit B2 geht zusätzlich die userId an den Service: Sie wird zur LiveKit-Identität
 * (coach_${userId}). Die organizationId taugt dafür nicht – im Studio-Plan teilen sich
 * mehrere Coachs eine Organisation und würden einander aus dem Raum werfen.
 */
@Controller('bookings')
@UseGuards(AuthGuard)
export class CoachCallController {
  constructor(
    private readonly callService: CallService,
    private readonly clientContextService: CallClientContextService,
    private readonly chatService: CallChatService,
  ) {}

  @Get(':id/call')
  find(
    @CurrentOrganization() org: { id: string } | undefined,
    @CurrentUser() user: SessionUser | undefined,
    @Param('id') id: string,
  ) {
    if (!org || !user) throw new UnauthorizedException('No active organization');
    return this.callService.getForCoach(org.id, user.id, id);
  }

  /**
   * Seitenleiste „Klient“: Stammdaten, Sitzungsnummer, nächster Termin und die letzten
   * Sitzungen mit Notiz. Nur hier, nicht im ClientCallController – der Klient hat keinen
   * Weg zu diesen Angaben.
   */
  @Get(':id/call/client')
  clientContext(
    @CurrentOrganization() org: { id: string } | undefined,
    @Param('id') id: string,
  ) {
    if (!org) throw new UnauthorizedException('No active organization');
    return this.clientContextService.getForCoach(org.id, id);
  }

  /**
   * Ereignisstrom: die „Klient wartet"-Benachrichtigung des Call-Screens
   * (doc/videocall-umsetzungsplan.md A2).
   *
   * `EventSource` kann keine Header setzen, schickt aber Cookies mit – der AuthGuard liest
   * die Session ohnehin aus den Request-Headern, und CORS steht in main.ts auf
   * `credentials: true`. Im Browser braucht es dafür `withCredentials`.
   */
  @Sse(':id/call/events')
  events(
    @CurrentOrganization() org: { id: string } | undefined,
    @CurrentUser() user: SessionUser | undefined,
    @Param('id') id: string,
  ) {
    if (!org || !user) throw new UnauthorizedException('No active organization');
    return this.callService.streamForCoach(org.id, user.id, id);
  }

  @Post(':id/call/admit')
  @HttpCode(HttpStatus.OK)
  admit(
    @CurrentOrganization() org: { id: string } | undefined,
    @CurrentUser() user: SessionUser | undefined,
    @Param('id') id: string,
  ) {
    if (!org || !user) throw new UnauthorizedException('No active organization');
    return this.callService.admit(org.id, user.id, id);
  }

  /**
   * Chat der Sitzung (B7). Lesen darf der Coach jederzeit – auch nach dem Gespräch, der
   * Verlauf ist für ihn gespeichert. `after` ist die Nummer der letzten bekannten Nachricht.
   */
  @Get(':id/call/messages')
  messages(
    @CurrentOrganization() org: { id: string } | undefined,
    @Param('id') id: string,
    @Query('after', new ParseIntPipe({ optional: true })) after?: number,
  ) {
    if (!org) throw new UnauthorizedException('No active organization');
    return this.chatService.listForCoach(org.id, id, after);
  }

  // Die userId geht mit, weil sie an der Nachricht hängt: Im Studio-Plan teilen sich mehrere
  // Coachs eine Organisation.
  @Post(':id/call/messages')
  sendMessage(
    @CurrentOrganization() org: { id: string } | undefined,
    @CurrentUser() user: SessionUser | undefined,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(sendCallMessageSchema)) dto: SendCallMessageDto,
  ) {
    if (!org || !user) throw new UnauthorizedException('No active organization');
    return this.chatService.sendAsCoach(org.id, user.id, id, dto);
  }

  /**
   * Datei mit optionalem Begleittext. Die Größe begrenzt schon multer; was für eine Datei es
   * wirklich ist, entscheidet der Dienst anhand von Endung und Signatur – der vom Browser
   * gemeldete Typ taugt dafür nicht.
   */
  @Post(':id/call/messages/files')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: CALL_FILE_MAX_BYTES } }))
  sendFile(
    @CurrentOrganization() org: { id: string } | undefined,
    @CurrentUser() user: SessionUser | undefined,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(sendCallFileSchema)) dto: SendCallFileDto,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!org || !user) throw new UnauthorizedException('No active organization');
    if (!file) throw new BadRequestException('No file provided');
    return this.chatService.sendFileAsCoach(org.id, user.id, id, dto, file);
  }

  /**
   * Weiterleitung auf einen frisch signierten Link (B7). Der Verlauf trägt deshalb eine
   * dauerhafte Adresse, während der Zugriff selbst nur 15 Minuten gilt und beim Klick geprüft
   * wird. 302 statt 307, weil daraus nie etwas anderes als ein GET werden soll.
   */
  @Get(':id/call/files/:fileId')
  @Redirect(undefined, HttpStatus.FOUND)
  async downloadFile(
    @CurrentOrganization() org: { id: string } | undefined,
    @Param('id') id: string,
    @Param('fileId') fileId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!org) throw new UnauthorizedException('No active organization');
    const url = await this.chatService.downloadUrlForCoach(org.id, id, fileId);
    // Die Weiterleitung selbst darf nirgends liegen bleiben: Sie trägt die Signatur.
    res.set({ 'Cache-Control': 'private, no-store' });
    return { url };
  }

  @Post(':id/call/end')
  @HttpCode(HttpStatus.OK)
  end(
    @CurrentOrganization() org: { id: string } | undefined,
    @CurrentUser() user: SessionUser | undefined,
    @Param('id') id: string,
  ) {
    if (!org || !user) throw new UnauthorizedException('No active organization');
    return this.callService.end(org.id, user.id, id);
  }
}
