import { Module } from '@nestjs/common';
import { AvailabilityController } from './availability.controller';
import { AvailabilityService } from './availability.service';
import { AvailabilitySettingsController } from './availability-settings.controller';
import { AvailabilitySettingsService } from './availability-settings.service';

@Module({
  controllers: [AvailabilityController, AvailabilitySettingsController],
  providers: [AvailabilityService, AvailabilitySettingsService],
})
export class AvailabilityModule {}
