import { Module } from '@nestjs/common';
import { AvailabilityModule } from '../availability/availability.module';
import { CalendarImportModule } from '../calendar-import/calendar-import.module';
import { OrganizationController } from './organization.controller';
import { OrganizationService } from './organization.service';

@Module({
  imports: [AvailabilityModule, CalendarImportModule],
  controllers: [OrganizationController],
  providers: [OrganizationService],
  exports: [OrganizationService],
})
export class OrganizationModule {}
