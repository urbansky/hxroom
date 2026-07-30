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
import { landingPageSchema, type LandingPageDto } from '@hxroom/shared';
import { LandingPageService } from './landing-page.service';

const ALLOWED_AVATAR_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_AVATAR_FILE_SIZE = 8 * 1024 * 1024;

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
    return this.landingPageService.uploadAvatar(org.id, file.buffer);
  }

  @Delete('avatar')
  deleteAvatar(@CurrentOrganization() org: { id: string } | undefined) {
    if (!org) throw new UnauthorizedException('No active organization');
    return this.landingPageService.deleteAvatar(org.id);
  }
}
