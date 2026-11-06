import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UnauthorizedException, UseGuards } from '@nestjs/common';
import {
  createCalendarImportSchema,
  listCalendarBusyTimesQuerySchema,
  syncCalendarImportsSchema,
  updateCalendarImportSchema,
  type CreateCalendarImportDto,
  type ListCalendarBusyTimesQuery,
  type SyncCalendarImportsDto,
  type UpdateCalendarImportDto,
} from '@hxroom/shared';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentOrganization } from '../auth/current-organization.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CalendarImportsService } from './calendar-imports.service';

@Controller('calendar-imports')
@UseGuards(AuthGuard)
export class CalendarImportsController {
  constructor(private readonly imports: CalendarImportsService) {}

  @Get()
  list(@CurrentOrganization() org: { id: string } | undefined) {
    if (!org) throw new UnauthorizedException('No active organization');
    return this.imports.list(org.id);
  }

  @Post()
  create(
    @CurrentOrganization() org: { id: string } | undefined,
    @Body(new ZodValidationPipe(createCalendarImportSchema)) dto: CreateCalendarImportDto,
  ) {
    if (!org) throw new UnauthorizedException('No active organization');
    return this.imports.create(org.id, dto);
  }

  // Aktivität in der Coach-App und Knopf „Jetzt abgleichen“; die Mindestabstände setzt der Dienst.
  @Post('sync')
  sync(
    @CurrentOrganization() org: { id: string } | undefined,
    @Body(new ZodValidationPipe(syncCalendarImportsSchema)) dto: SyncCalendarImportsDto,
  ) {
    if (!org) throw new UnauthorizedException('No active organization');
    return this.imports.syncNow(org.id, dto.trigger);
  }

  @Get('busy-times')
  busyTimes(
    @CurrentOrganization() org: { id: string } | undefined,
    @Query(new ZodValidationPipe(listCalendarBusyTimesQuerySchema)) query: ListCalendarBusyTimesQuery,
  ) {
    if (!org) throw new UnauthorizedException('No active organization');
    return this.imports.busyTimes(org.id, { start: new Date(query.from), end: new Date(query.to) });
  }

  @Patch(':id')
  update(
    @CurrentOrganization() org: { id: string } | undefined,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateCalendarImportSchema)) dto: UpdateCalendarImportDto,
  ) {
    if (!org) throw new UnauthorizedException('No active organization');
    return this.imports.update(org.id, id, dto);
  }

  @Delete(':id')
  remove(
    @CurrentOrganization() org: { id: string } | undefined,
    @Param('id') id: string,
  ) {
    if (!org) throw new UnauthorizedException('No active organization');
    return this.imports.remove(org.id, id);
  }
}
