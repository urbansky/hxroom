import { Body, Controller, Delete, Get, Param, Patch, Post, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentOrganization } from '../auth/current-organization.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { createOfferSchema, updateOfferSchema, reorderOffersSchema, type CreateOfferDto, type UpdateOfferDto, type ReorderOffersDto } from '@hxroom/shared';
import { OffersService } from './offers.service';

@Controller('offers')
@UseGuards(AuthGuard)
export class OffersController {
  constructor(private readonly offersService: OffersService) {}

  @Get()
  list(@CurrentOrganization() org: { id: string } | undefined) {
    if (!org) throw new UnauthorizedException('No active organization');
    return this.offersService.list(org.id);
  }

  @Post()
  create(
    @CurrentOrganization() org: { id: string } | undefined,
    @Body(new ZodValidationPipe(createOfferSchema)) dto: CreateOfferDto,
  ) {
    if (!org) throw new UnauthorizedException('No active organization');
    return this.offersService.create(org.id, dto);
  }

  @Patch('reorder')
  reorder(
    @CurrentOrganization() org: { id: string } | undefined,
    @Body(new ZodValidationPipe(reorderOffersSchema)) dto: ReorderOffersDto,
  ) {
    if (!org) throw new UnauthorizedException('No active organization');
    return this.offersService.reorder(org.id, dto.ids);
  }

  @Patch(':id')
  update(
    @CurrentOrganization() org: { id: string } | undefined,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateOfferSchema)) dto: UpdateOfferDto,
  ) {
    if (!org) throw new UnauthorizedException('No active organization');
    return this.offersService.update(org.id, id, dto);
  }

  @Delete(':id')
  remove(
    @CurrentOrganization() org: { id: string } | undefined,
    @Param('id') id: string,
  ) {
    if (!org) throw new UnauthorizedException('No active organization');
    return this.offersService.remove(org.id, id);
  }
}
