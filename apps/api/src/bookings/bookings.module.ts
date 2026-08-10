import { Module } from '@nestjs/common';
import { OrganizationModule } from '../organization/organization.module';
import { MailModule } from '../mail/mail.module';
import { BookingCreationController } from './booking-creation.controller';
import { BookingConfirmationController } from './booking-confirmation.controller';
import { CoachBookingsController } from './coach-bookings.controller';
import { BookingsService } from './bookings.service';
import { CoachBookingsService } from './coach-bookings.service';
import { BookingExpiryService } from './booking-expiry.service';

@Module({
  imports: [OrganizationModule, MailModule],
  controllers: [BookingCreationController, BookingConfirmationController, CoachBookingsController],
  providers: [BookingsService, CoachBookingsService, BookingExpiryService],
})
export class BookingsModule {}
