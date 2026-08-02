import { Body, Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { confirmBookingSchema, type ConfirmBookingDto } from '@hxroom/shared';
import { BookingsService } from './bookings.service';

@Controller('bookings')
export class BookingConfirmationController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post(':id/confirm')
  @HttpCode(HttpStatus.OK)
  confirm(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(confirmBookingSchema)) dto: ConfirmBookingDto,
  ) {
    return this.bookingsService.confirm(id, dto.token);
  }
}
