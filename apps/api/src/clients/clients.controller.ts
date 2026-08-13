import { Body, Controller, Get, Param, Patch, Post, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentOrganization } from '../auth/current-organization.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { createClientSchema, updateClientSchema, type CreateClientDto, type UpdateClientDto } from '@hxroom/shared';
import { ClientsService } from './clients.service';

// Klientenverwaltung im Coach-Backoffice (doc/funktionen/backoffice-coach.md, Abschnitt 3).
// Kein DELETE: das Löschen von Klientendaten ist DSGVO-relevant (Abschnitt 7, Funktion 04)
// und braucht ein Löschprotokoll – bewusst ein eigener Schritt.
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

  @Patch(':id')
  update(
    @CurrentOrganization() org: { id: string } | undefined,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateClientSchema)) dto: UpdateClientDto,
  ) {
    if (!org) throw new UnauthorizedException('No active organization');
    return this.clientsService.update(org.id, id, dto);
  }
}
