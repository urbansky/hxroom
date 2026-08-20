import { Controller, Get, HttpCode, HttpStatus, Param, Post, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentOrganization } from '../auth/current-organization.decorator';
import { CallService } from './call.service';

/**
 * Call-Screen des Coachs (doc/videocall-umsetzungsplan.md A1). Zugriff über die
 * better-auth Session; welche Buchung er sehen darf, entscheidet allein seine
 * activeOrganizationId.
 */
@Controller('bookings')
@UseGuards(AuthGuard)
export class CoachCallController {
  constructor(private readonly callService: CallService) {}

  @Get(':id/call')
  find(@CurrentOrganization() org: { id: string } | undefined, @Param('id') id: string) {
    if (!org) throw new UnauthorizedException('No active organization');
    return this.callService.getForCoach(org.id, id);
  }

  @Post(':id/call/admit')
  @HttpCode(HttpStatus.OK)
  admit(@CurrentOrganization() org: { id: string } | undefined, @Param('id') id: string) {
    if (!org) throw new UnauthorizedException('No active organization');
    return this.callService.admit(org.id, id);
  }

  @Post(':id/call/end')
  @HttpCode(HttpStatus.OK)
  end(@CurrentOrganization() org: { id: string } | undefined, @Param('id') id: string) {
    if (!org) throw new UnauthorizedException('No active organization');
    return this.callService.end(org.id, id);
  }
}
