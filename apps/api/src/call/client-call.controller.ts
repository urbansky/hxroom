import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, Query, Sse } from '@nestjs/common';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  enterWaitingRoomSchema,
  sendClientCallMessageSchema,
  type EnterWaitingRoomDto,
  type SendClientCallMessageDto,
} from '@hxroom/shared';
import { CallService } from './call.service';
import { CallChatService } from './call-chat.service';

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
  constructor(
    private readonly callService: CallService,
    private readonly chatService: CallChatService,
  ) {}

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

  /**
   * Ereignisstrom: meldet dem wartenden Klienten, dass der Coach ihn eingelassen oder die
   * Sitzung beendet hat (doc/videocall-umsetzungsplan.md A2).
   *
   * Auch hier steht der Token in der Query – `EventSource` kann weder einen Body noch
   * eigene Header senden. Solange dieser Strom offen ist, gilt der Klient als anwesend.
   */
  @Sse(':id/waiting-room/events')
  events(@Param('id') id: string, @Query('token') token: string) {
    return this.callService.streamForClient(id, token ?? '');
  }

  /**
   * Chat der Sitzung (B7). Unter demselben Pfadsegment wie der übrige Zugang des Klienten –
   * `waiting-room` benennt seinen Weg herein, nicht die Wartezeit.
   *
   * Lesen darf er, solange sein Zugang gilt; schreiben nur im laufenden Gespräch. Der Token
   * steht beim Lesen in der Query und beim Senden im Body, wie beim Betreten des Warteraums.
   */
  @Get(':id/waiting-room/messages')
  messages(
    @Param('id') id: string,
    @Query('token') token: string,
    @Query('after', new ParseIntPipe({ optional: true })) after?: number,
  ) {
    return this.chatService.listForClient(id, token ?? '', after);
  }

  @Post(':id/waiting-room/messages')
  @HttpCode(HttpStatus.CREATED)
  sendMessage(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(sendClientCallMessageSchema)) dto: SendClientCallMessageDto,
  ) {
    const { token, ...message } = dto;
    return this.chatService.sendAsClient(id, token, message);
  }
}
