import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { listCoachesQuerySchema, type ListCoachesQuery } from '@hxroom/shared';
import { AdminCoachesService } from './admin-coaches.service';

/**
 * Coach-Verwaltung im Betreiber-Backoffice (doc/funktionen/backoffice-betreiber.md, 1).
 *
 * Kein @CurrentOrganization() wie in jedem anderen Controller: Ein Betreiber ist Mitglied
 * keiner Organisation, und der AdminGuard setzt req.organization deshalb bewusst nicht.
 * Die Abgrenzung läuft hier nicht über Mandanten, sondern über die Rolle.
 */
@Controller('admin/coaches')
@UseGuards(AdminGuard)
export class AdminCoachesController {
  constructor(private readonly adminCoachesService: AdminCoachesService) {}

  @Get()
  list(@Query(new ZodValidationPipe(listCoachesQuerySchema)) query: ListCoachesQuery) {
    return this.adminCoachesService.list(query);
  }
}
