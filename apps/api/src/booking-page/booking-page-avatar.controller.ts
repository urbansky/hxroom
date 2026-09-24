import { Controller, Get, NotFoundException, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { BookingPageService } from './booking-page.service';

// Bewusst ohne AuthGuard: Coach-Profilbilder sind öffentlich sichtbare Assets
// (Buchungsseite, Social-Previews). Presigned URLs sind hier ungeeignet, weil sie
// ablaufen – ein Crawler oder ein anonymer Besucher hat keine frische URL. Lokal
// kommt hinzu, dass RustFS nur an 127.0.0.1 gebunden ist.
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
