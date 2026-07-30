import { Controller, Get, NotFoundException, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { BookingPageService } from './booking-page.service';

// Bewusst ohne AuthGuard: Coach-Profilbilder sind öffentlich sichtbare Assets
// (Buchungsseite, Social-Previews). Presigned URLs sind hier ungeeignet, da
// RustFS/Hetzner Object Storage nicht öffentlich erreichbar ist bzw. presigned
// URLs für dauerhaft öffentliche, gut cachebare Inhalte ablaufen würden.
// Siehe doc/s3-verzeichnisschema.md.
@Controller('booking-page/avatar')
export class BookingPageAvatarController {
  constructor(private readonly bookingPageService: BookingPageService) {}

  @Get(':organizationId')
  async getAvatar(@Param('organizationId') organizationId: string, @Res() res: Response) {
    const avatar = await this.bookingPageService.getAvatarStream(organizationId);
    if (!avatar) {
      throw new NotFoundException('Avatar not found');
    }

    res.set({
      'Content-Type': avatar.contentType ?? 'image/webp',
      'Cache-Control': 'public, max-age=300, must-revalidate',
    });
    avatar.body.pipe(res);
  }
}
