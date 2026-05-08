import { Body, Controller, HttpCode, Ip, Post, UsePipes } from '@nestjs/common';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { subscribeSchema, SubscribeDto } from '@hxroom/shared';
import { NewsletterService } from './newsletter.service';

@Controller('newsletter')
export class NewsletterController {
  constructor(private readonly service: NewsletterService) {}

  @Post('subscribe')
  @HttpCode(200)
  @UsePipes(new ZodValidationPipe(subscribeSchema))
  async subscribe(@Body() dto: SubscribeDto, @Ip() ip: string) {
    await this.service.subscribe(dto, ip);
    return { ok: true };
  }
}
