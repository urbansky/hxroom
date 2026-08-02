import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DbModule } from './db/db.module';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { MailModule } from './mail/mail.module';
import { OrganizationModule } from './organization/organization.module';
import { BookingPageModule } from './booking-page/booking-page.module';
import { OffersModule } from './offers/offers.module';
import { AvailabilityModule } from './availability/availability.module';
import { S3Module } from './storage/s3.module';
import { BookingsModule } from './bookings/bookings.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DbModule,
    S3Module,
    AuthModule,
    HealthModule,
    MailModule,
    OrganizationModule,
    BookingPageModule,
    OffersModule,
    AvailabilityModule,
    BookingsModule,
  ],
})
export class AppModule {}
