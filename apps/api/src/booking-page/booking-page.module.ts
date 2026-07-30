import { Module } from '@nestjs/common';
import { BookingPageController } from './booking-page.controller';
import { BookingPageAvatarController } from './booking-page-avatar.controller';
import { BookingPageService } from './booking-page.service';

@Module({
  controllers: [BookingPageController, BookingPageAvatarController],
  providers: [BookingPageService],
})
export class BookingPageModule {}
