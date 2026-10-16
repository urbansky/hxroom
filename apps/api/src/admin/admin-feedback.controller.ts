import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { listFeedbackQuerySchema, type ListFeedbackQuery } from '@hxroom/shared';
import { AdminFeedbackService } from './admin-feedback.service';

/** Feedback der Coachs im Betreiber-Backoffice (doc/phase5-umsetzungsplan.md, 7a). */
@Controller('admin/feedback')
@UseGuards(AdminGuard)
export class AdminFeedbackController {
  constructor(private readonly adminFeedbackService: AdminFeedbackService) {}

  @Get()
  list(@Query(new ZodValidationPipe(listFeedbackQuerySchema)) query: ListFeedbackQuery) {
    return this.adminFeedbackService.list(query);
  }
}
