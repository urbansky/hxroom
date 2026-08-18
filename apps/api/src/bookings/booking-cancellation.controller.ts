import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { cancelBookingByClientSchema, type CancelBookingByClientDto } from '@hxroom/shared';
import { BookingsService } from './bookings.service';

/**
 * Selbstabsage des Klienten über den Link aus der Bestätigungsmail
 * (doc/funktionen/backoffice-coach.md 2.06). Bewusst ohne AuthGuard: der Klient hat kein
 * Konto, sein einziger Ausweis ist der clientAccessToken – wie beim Bestätigungs-Flow.
 *
 * Eigener Pfad statt /bookings/:id/cancel, weil dort der authentifizierte Endpunkt des
 * Coachs liegt (CoachBookingsController).
 */
@Controller('bookings')
export class BookingCancellationController {
  constructor(private readonly bookingsService: BookingsService) {}

  // Zeigt dem Klienten vor dem Absagen, welchen Termin er trifft. Der Token steht in der
  // Query, weil er im Mail-Link ohnehin dort steht – geloggt wird er nirgends.
  @Get(':id/cancellation')
  find(@Param('id') id: string, @Query('token') token: string) {
    return this.bookingsService.findForClient(id, token ?? '');
  }

  @Post(':id/cancellation')
  @HttpCode(HttpStatus.OK)
  cancel(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(cancelBookingByClientSchema)) dto: CancelBookingByClientDto,
  ) {
    return this.bookingsService.cancelByClient(id, dto.token, dto.reason);
  }
}
