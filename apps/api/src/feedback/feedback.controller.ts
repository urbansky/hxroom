import { Body, Controller, Headers, HttpCode, HttpStatus, Post, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentOrganization } from '../auth/current-organization.decorator';
import { CurrentUser, type SessionUser } from '../auth/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { createFeedbackSchema, type CreateFeedbackDto } from '@hxroom/shared';
import { FeedbackService } from './feedback.service';

/** Feedback-Knopf der Coach-App (doc/phase5-umsetzungsplan.md, 7a). */
@Controller('feedback')
@UseGuards(AuthGuard)
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  async create(
    @CurrentOrganization() org: { id: string } | undefined,
    @CurrentUser() user: SessionUser | undefined,
    @Headers('user-agent') userAgent: string | undefined,
    @Body(new ZodValidationPipe(createFeedbackSchema)) dto: CreateFeedbackDto,
  ) {
    if (!org || !user) throw new UnauthorizedException('No active organization');
    await this.feedbackService.create(org.id, user, dto, userAgent ?? null);
  }
}
