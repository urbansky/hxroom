import { Body, Controller, Delete, Get, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentOrganization } from '../auth/current-organization.decorator';
import { CurrentUser, type SessionUser } from '../auth/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  acceptTermsSchema,
  requestAccountDeletionSchema,
  type RequestAccountDeletionDto,
} from '@hxroom/shared';
import { AccountDeletionService } from './account-deletion.service';
import { ExportService } from './export/export.service';
import { TermsService } from './terms.service';

/** Hat ein Betreiber diese Sitzung übernommen (better-auth admin plugin)? */
function isImpersonated(req: Request): boolean {
  const session = (req as Request & { session?: { session?: { impersonatedBy?: string | null } } }).session;
  return !!session?.session?.impersonatedBy;
}

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
  constructor(
    private readonly deletionService: AccountDeletionService,
    private readonly exportService: ExportService,
    private readonly termsService: TermsService,
  ) {}

  /** Zustimmung zu AGB und AVV (phase5-umsetzungsplan.md, 5a). */
  @Get('terms')
  termsStatus(@CurrentUser() sessionUser: SessionUser | undefined, @Req() req: Request) {
    if (!sessionUser) throw new UnauthorizedException('Not authenticated');
    return this.termsService.status(sessionUser.id, isImpersonated(req));
  }

  @Post('terms')
  acceptTerms(
    @CurrentUser() sessionUser: SessionUser | undefined,
    // Nur zur Prüfung: Die Coach-App schickt die Fassung, die sie gezeigt hat.
    @Body(new ZodValidationPipe(acceptTermsSchema)) _dto: unknown,
    @Req() req: Request,
  ) {
    if (!sessionUser) throw new UnauthorizedException('Not authenticated');
    return this.termsService.accept(sessionUser.id, isImpersonated(req));
  }

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

  /** Datenexport als ZIP-Datei (phase5-umsetzungsplan.md, Schritt 10). */
  @Get('export')
  async export(
    @CurrentOrganization() org: { id: string } | undefined,
    @Res() res: Response,
  ) {
    if (!org) throw new UnauthorizedException('No active organization');
    const { fileName, zip } = await this.exportService.build(org.id);
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Content-Length': String(zip.byteLength),
      'Cache-Control': 'no-store',
      // Die Coach-App liegt auf einem anderen Host; ohne Freigabe liest sie den Dateinamen nicht.
      'Access-Control-Expose-Headers': 'Content-Disposition',
    });
    res.send(Buffer.from(zip));
  }
}
