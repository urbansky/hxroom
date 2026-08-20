import { Module } from '@nestjs/common';
import { OrganizationModule } from '../organization/organization.module';
import { MailModule } from '../mail/mail.module';
import { CallModule } from '../call/call.module';
import { BookingCreationController } from './booking-creation.controller';
import { BookingConfirmationController } from './booking-confirmation.controller';
import { BookingCancellationController } from './booking-cancellation.controller';
import { CoachBookingsController } from './coach-bookings.controller';
import { BookingsService } from './bookings.service';
import { CoachBookingsService } from './coach-bookings.service';
import { BookingExpiryService } from './booking-expiry.service';

// CallModule liefert den Ereigniskanal, über den eine Absage des Coachs einen wartenden
// Klienten sofort erreicht. Die Richtung ist bewusst diese: Das Call-Modul kennt die
// Buchungen nicht.
@Module({
  imports: [OrganizationModule, MailModule, CallModule],
  controllers: [BookingCreationController, BookingConfirmationController, BookingCancellationController, CoachBookingsController],
  providers: [BookingsService, CoachBookingsService, BookingExpiryService],
})
export class BookingsModule {}
