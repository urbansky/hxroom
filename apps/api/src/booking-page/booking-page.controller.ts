import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentOrganization } from '../auth/current-organization.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { bookingPageSchema, type BookingPageDto } from '@hxroom/shared';
import { BookingPageService } from './booking-page.service';

const ALLOWED_AVATAR_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_AVATAR_FILE_SIZE = 8 * 1024 * 1024;

@Controller('booking-page')
@UseGuards(AuthGuard)
export class BookingPageController {
  constructor(private readonly bookingPageService: BookingPageService) {}

  @Get()
  get(@CurrentOrganization() org: { id: string } | undefined) {
    if (!org) throw new UnauthorizedException('No active organization');
    return this.bookingPageService.get(org.id);
  }

  @Patch()
  update(
    @CurrentOrganization() org: { id: string } | undefined,
    @Body(new ZodValidationPipe(bookingPageSchema)) dto: BookingPageDto,
  ) {
    if (!org) throw new UnauthorizedException('No active organization');
    return this.bookingPageService.update(org.id, dto);
  }

  @Post('avatar')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: MAX_AVATAR_FILE_SIZE },
    fileFilter: (_req, file, cb) => {
      if (!ALLOWED_AVATAR_MIME_TYPES.includes(file.mimetype)) {
        cb(new BadRequestException('Invalid file type. Allowed: JPEG, PNG, WebP'), false);
        return;
      }
      cb(null, true);
    },
  }))
  uploadAvatar(
    @CurrentOrganization() org: { id: string } | undefined,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!org) throw new UnauthorizedException('No active organization');
    if (!file) throw new BadRequestException('No file provided');
    return this.bookingPageService.uploadAvatar(org.id, file.buffer);
  }

  @Delete('avatar')
  deleteAvatar(@CurrentOrganization() org: { id: string } | undefined) {
    if (!org) throw new UnauthorizedException('No active organization');
    return this.bookingPageService.deleteAvatar(org.id);
  }
}
