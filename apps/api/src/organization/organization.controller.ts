import { Controller, Get, Param } from '@nestjs/common';
import { OrganizationService } from './organization.service';

@Controller('organizations')
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.organizationService.findBySlug(slug);
  }

  @Get(':slug/offers')
  findActiveOffers(@Param('slug') slug: string) {
    return this.organizationService.findActiveOffersBySlug(slug);
  }

  @Get(':slug/offers/:offerId/available-slots')
  findAvailableSlots(@Param('slug') slug: string, @Param('offerId') offerId: string) {
    return this.organizationService.findAvailableSlots(slug, offerId);
  }
}
