import { Body, Controller, Delete, Get, Param, Patch, Post, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentOrganization } from '../auth/current-organization.decorator';
import { CurrentUser, type SessionUser } from '../auth/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { createClientSchema, updateClientSchema, type CreateClientDto, type UpdateClientDto } from '@hxroom/shared';
import { ClientsService } from './clients.service';

// Klientenverwaltung im Coach-Backoffice (doc/funktionen/backoffice-coach.md, Abschnitt 3).
// Das Löschen (Abschnitt 7, Funktion 04) nimmt Termine, Notizen, Chat und Dateien mit und
// hinterlässt ein Löschprotokoll ohne personenbezogene Daten (client_deletions).
@Controller('clients')
@UseGuards(AuthGuard)
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  list(@CurrentOrganization() org: { id: string } | undefined) {
    if (!org) throw new UnauthorizedException('No active organization');
    return this.clientsService.list(org.id);
  }

  @Post()
  create(
    @CurrentOrganization() org: { id: string } | undefined,
    @Body(new ZodValidationPipe(createClientSchema)) dto: CreateClientDto,
  ) {
    if (!org) throw new UnauthorizedException('No active organization');
    return this.clientsService.create(org.id, dto);
  }

  @Get(':id')
  findOne(
    @CurrentOrganization() org: { id: string } | undefined,
    @Param('id') id: string,
  ) {
    if (!org) throw new UnauthorizedException('No active organization');
    return this.clientsService.findOne(org.id, id);
  }

  /** Notizen-Chronik der Klientenseite (Funktionsliste 4.02). */
  @Get(':id/notes')
  notes(
    @CurrentOrganization() org: { id: string } | undefined,
    @Param('id') id: string,
  ) {
    if (!org) throw new UnauthorizedException('No active organization');
    return this.clientsService.notes(org.id, id);
  }

  /** Alle im Chat geteilten Dateien des Klienten. */
  @Get(':id/files')
  files(
    @CurrentOrganization() org: { id: string } | undefined,
    @Param('id') id: string,
  ) {
    if (!org) throw new UnauthorizedException('No active organization');
    return this.clientsService.files(org.id, id);
  }

  @Patch(':id')
  update(
    @CurrentOrganization() org: { id: string } | undefined,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateClientSchema)) dto: UpdateClientDto,
  ) {
    if (!org) throw new UnauthorizedException('No active organization');
    return this.clientsService.update(org.id, id, dto);
  }

  @Delete(':id')
  remove(
    @CurrentOrganization() org: { id: string } | undefined,
    @CurrentUser() user: SessionUser | undefined,
    @Param('id') id: string,
  ) {
    if (!org || !user) throw new UnauthorizedException('No active organization');
    return this.clientsService.delete(org.id, id, user.id);
  }
}
