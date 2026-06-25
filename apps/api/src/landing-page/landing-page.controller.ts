import { Body, Controller, Get, Patch, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentOrganization } from '../auth/current-organization.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { landingPageSchema, type LandingPageDto } from '@hxroom/shared';
import { LandingPageService } from './landing-page.service';

@Controller('landing-page')
@UseGuards(AuthGuard)
export class LandingPageController {
  constructor(private readonly landingPageService: LandingPageService) {}

  @Get()
  get(@CurrentOrganization() org: { id: string } | undefined) {
    if (!org) throw new UnauthorizedException('No active organization');
    return this.landingPageService.get(org.id);
  }

  @Patch()
  update(
    @CurrentOrganization() org: { id: string } | undefined,
    @Body(new ZodValidationPipe(landingPageSchema)) dto: LandingPageDto,
  ) {
    if (!org) throw new UnauthorizedException('No active organization');
    return this.landingPageService.update(org.id, dto);
  }
}
