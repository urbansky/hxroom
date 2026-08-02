import { Body, Controller, Param, Post } from '@nestjs/common';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { createBookingSchema, type CreateBookingDto } from '@hxroom/shared';
import { BookingsService } from './bookings.service';

@Controller('organizations/:slug/offers/:offerId')
export class BookingCreationController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post('bookings')
  create(
    @Param('slug') slug: string,
    @Param('offerId') offerId: string,
    @Body(new ZodValidationPipe(createBookingSchema)) dto: CreateBookingDto,
  ) {
    return this.bookingsService.create(slug, offerId, dto);
  }
}
