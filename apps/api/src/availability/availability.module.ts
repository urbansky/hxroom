import { Module } from '@nestjs/common';
import { AvailabilityController } from './availability.controller';
import { AvailabilityService } from './availability.service';
import { AvailabilitySettingsController } from './availability-settings.controller';
import { AvailabilitySettingsService } from './availability-settings.service';
import { AvailabilityExceptionsController } from './availability-exceptions.controller';
import { AvailabilityExceptionsService } from './availability-exceptions.service';

// AvailabilityExceptionsService wird exportiert: Die Slot-Berechnung (OrganizationService)
// und die Prüfung beim manuellen Anlegen (CoachBookingsService) brauchen die Ausnahmen.
@Module({
  controllers: [AvailabilityController, AvailabilitySettingsController, AvailabilityExceptionsController],
  providers: [AvailabilityService, AvailabilitySettingsService, AvailabilityExceptionsService],
  exports: [AvailabilityExceptionsService],
})
export class AvailabilityModule {}
