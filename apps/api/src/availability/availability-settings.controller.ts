import { Body, Controller, Get, Patch, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentOrganization } from '../auth/current-organization.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { availabilitySettingsSchema, type AvailabilitySettingsDto } from '@hxroom/shared';
import { AvailabilitySettingsService } from './availability-settings.service';

@Controller('availability-settings')
@UseGuards(AuthGuard)
export class AvailabilitySettingsController {
  constructor(private readonly availabilitySettingsService: AvailabilitySettingsService) {}

  @Get()
  get(@CurrentOrganization() org: { id: string } | undefined) {
    if (!org) throw new UnauthorizedException('No active organization');
    return this.availabilitySettingsService.get(org.id);
  }

  @Patch()
  update(
    @CurrentOrganization() org: { id: string } | undefined,
    @Body(new ZodValidationPipe(availabilitySettingsSchema)) dto: AvailabilitySettingsDto,
  ) {
    if (!org) throw new UnauthorizedException('No active organization');
    return this.availabilitySettingsService.update(org.id, dto);
  }
}
