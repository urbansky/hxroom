import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Put,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentOrganization } from '../auth/current-organization.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { bookingPageLegalSchema, bookingPageSchema, type BookingPageDto, type BookingPageLegalDto } from '@hxroom/shared';
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

  @Get('legal')
  getLegal(@CurrentOrganization() org: { id: string } | undefined) {
    if (!org) throw new UnauthorizedException('No active organization');
    return this.bookingPageService.getLegal(org.id);
  }

  // PUT statt PATCH und getrennt vom Autosave oben: Impressum und Links werden als Ganzes
  // gespeichert, und die Bestätigung gilt für genau diesen Stand.
  @Put('legal')
  updateLegal(
    @CurrentOrganization() org: { id: string } | undefined,
    @Body(new ZodValidationPipe(bookingPageLegalSchema)) dto: BookingPageLegalDto,
  ) {
    if (!org) throw new UnauthorizedException('No active organization');
    return this.bookingPageService.updateLegal(org.id, dto);
  }

  // Eigener Endpunkt statt eines Feldes im PATCH oben: der ist der Autosave der
  // Buchungsseite, das Onboarding-Flag hat mit deren Inhalten nichts zu tun.
  @Post('onboarding-celebrated')
  markOnboardingCelebrated(@CurrentOrganization() org: { id: string } | undefined) {
    if (!org) throw new UnauthorizedException('No active organization');
    return this.bookingPageService.markOnboardingCelebrated(org.id);
  }

  // Erstes Kopieren des Buchungslinks, für die Checkliste. Wie das Onboarding-Flag ein
  // eigener Endpunkt neben dem Autosave.
  @Post('link-shared')
  @HttpCode(HttpStatus.NO_CONTENT)
  markLinkShared(@CurrentOrganization() org: { id: string } | undefined) {
    if (!org) throw new UnauthorizedException('No active organization');
    return this.bookingPageService.markLinkShared(org.id);
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
