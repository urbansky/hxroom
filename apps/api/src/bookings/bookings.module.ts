import { Module } from '@nestjs/common';
import { OrganizationModule } from '../organization/organization.module';
import { BookingCreationController } from './booking-creation.controller';
import { BookingConfirmationController } from './booking-confirmation.controller';
import { BookingsService } from './bookings.service';

@Module({
  imports: [OrganizationModule],
  controllers: [BookingCreationController, BookingConfirmationController],
  providers: [BookingsService],
})
export class BookingsModule {}
