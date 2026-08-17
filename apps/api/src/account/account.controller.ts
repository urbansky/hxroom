import { Body, Controller, Delete, Get, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentOrganization } from '../auth/current-organization.decorator';
import { CurrentUser, type SessionUser } from '../auth/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { requestAccountDeletionSchema, type RequestAccountDeletionDto } from '@hxroom/shared';
import { AccountDeletionService } from './account-deletion.service';

/**
 * Eigenes Konto des Coachs. Passwort ändern und E-Mail-Adresse wechseln laufen direkt über
 * better-auth (siehe auth.module.ts) und brauchen hier nichts – nur die Löschung ist ein
 * eigener Weg, weil sie über die Organisation gehen und ein Protokoll schreiben muss
 * (doc/technisches-konzept.md §17).
 *
 * `deletion` ist Singular, weil es genau ein Löschvorgang pro Konto ist und kein
 * Sammelobjekt; die Plural-Konvention aus CLAUDE.md gilt für Sammlungen wie /bookings.
 */
@Controller('account')
@UseGuards(AuthGuard)
export class AccountController {
  constructor(private readonly deletionService: AccountDeletionService) {}

  @Get('deletion')
  status(@CurrentOrganization() org: { id: string } | undefined) {
    if (!org) throw new UnauthorizedException('No active organization');
    return this.deletionService.status(org.id);
  }

  @Post('deletion')
  request(
    @CurrentOrganization() org: { id: string } | undefined,
    @CurrentUser() sessionUser: SessionUser | undefined,
    @Body(new ZodValidationPipe(requestAccountDeletionSchema)) dto: RequestAccountDeletionDto,
    // Die Header werden für die Passwortprüfung über better-auth gebraucht: sie trägt das
    // Session-Cookie, das auth.api.verifyPassword erwartet.
    @Req() req: Request,
  ) {
    if (!org) throw new UnauthorizedException('No active organization');
    if (!sessionUser) throw new UnauthorizedException('Not authenticated');
    return this.deletionService.request(org.id, sessionUser.id, dto.password, req.headers);
  }

  @Delete('deletion')
  revoke(@CurrentOrganization() org: { id: string } | undefined) {
    if (!org) throw new UnauthorizedException('No active organization');
    return this.deletionService.revoke(org.id);
  }
}
