import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { enterWaitingRoomSchema, type EnterWaitingRoomDto } from '@hxroom/shared';
import { CallService } from './call.service';

/**
 * Warteraum des Klienten (doc/videocall-umsetzungsplan.md A1). Bewusst ohne AuthGuard:
 * der Klient hat kein Konto, sein einziger Ausweis ist der clientAccessToken aus dem
 * Mail-Link – wie beim Bestätigungs- und Absage-Flow.
 *
 * Eigenes Pfadsegment statt eines gemeinsamen Endpunkts mit dem Coach: derselbe Pfad
 * kann nicht zugleich mit und ohne Guard bedient werden. Dasselbe Muster trennt heute
 * schon /bookings/:id/cancellation (Klient) von /bookings/:id/cancel (Coach).
 */
@Controller('bookings')
export class ClientCallController {
  constructor(private readonly callService: CallService) {}

  // Der Token steht in der Query, weil er im Mail-Link ohnehin dort steht – geloggt
  // wird er nirgends.
  @Get(':id/waiting-room')
  find(@Param('id') id: string, @Query('token') token: string) {
    return this.callService.getForClient(id, token ?? '');
  }

  @Post(':id/waiting-room')
  @HttpCode(HttpStatus.OK)
  enter(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(enterWaitingRoomSchema)) dto: EnterWaitingRoomDto,
  ) {
    return this.callService.enterWaitingRoom(id, dto.token);
  }
}
