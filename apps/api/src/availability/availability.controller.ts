import { Body, Controller, Delete, Get, Param, Patch, Post, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentOrganization } from '../auth/current-organization.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { createAvailabilitySlotSchema, updateAvailabilitySlotSchema, type CreateAvailabilitySlotDto, type UpdateAvailabilitySlotDto } from '@hxroom/shared';
import { AvailabilityService } from './availability.service';

@Controller('availability-slots')
@UseGuards(AuthGuard)
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get()
  list(@CurrentOrganization() org: { id: string } | undefined) {
    if (!org) throw new UnauthorizedException('No active organization');
    return this.availabilityService.list(org.id);
  }

  @Post()
  create(
    @CurrentOrganization() org: { id: string } | undefined,
    @Body(new ZodValidationPipe(createAvailabilitySlotSchema)) dto: CreateAvailabilitySlotDto,
  ) {
    if (!org) throw new UnauthorizedException('No active organization');
    return this.availabilityService.create(org.id, dto);
  }

  @Patch(':id')
  update(
    @CurrentOrganization() org: { id: string } | undefined,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateAvailabilitySlotSchema)) dto: UpdateAvailabilitySlotDto,
  ) {
    if (!org) throw new UnauthorizedException('No active organization');
    return this.availabilityService.update(org.id, id, dto);
  }

  @Delete(':id')
  remove(
    @CurrentOrganization() org: { id: string } | undefined,
    @Param('id') id: string,
  ) {
    if (!org) throw new UnauthorizedException('No active organization');
    return this.availabilityService.remove(org.id, id);
  }
}
