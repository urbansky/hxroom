import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UnauthorizedException, UseGuards } from '@nestjs/common';
import {
  availabilityExceptionSchema,
  listAvailabilityExceptionsQuerySchema,
  type AvailabilityExceptionDto,
  type ListAvailabilityExceptionsQuery,
} from '@hxroom/shared';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentOrganization } from '../auth/current-organization.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AvailabilityExceptionsService } from './availability-exceptions.service';

@Controller('availability-exceptions')
@UseGuards(AuthGuard)
export class AvailabilityExceptionsController {
  constructor(private readonly exceptionsService: AvailabilityExceptionsService) {}

  @Get()
  list(
    @CurrentOrganization() org: { id: string } | undefined,
    @Query(new ZodValidationPipe(listAvailabilityExceptionsQuerySchema)) query: ListAvailabilityExceptionsQuery,
  ) {
    if (!org) throw new UnauthorizedException('No active organization');
    return this.exceptionsService.list(org.id, query);
  }

  @Post()
  create(
    @CurrentOrganization() org: { id: string } | undefined,
    @Body(new ZodValidationPipe(availabilityExceptionSchema)) dto: AvailabilityExceptionDto,
  ) {
    if (!org) throw new UnauthorizedException('No active organization');
    return this.exceptionsService.create(org.id, dto);
  }

  @Patch(':id')
  update(
    @CurrentOrganization() org: { id: string } | undefined,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(availabilityExceptionSchema)) dto: AvailabilityExceptionDto,
  ) {
    if (!org) throw new UnauthorizedException('No active organization');
    return this.exceptionsService.update(org.id, id, dto);
  }

  @Delete(':id')
  remove(
    @CurrentOrganization() org: { id: string } | undefined,
    @Param('id') id: string,
  ) {
    if (!org) throw new UnauthorizedException('No active organization');
    return this.exceptionsService.remove(org.id, id);
  }
}
