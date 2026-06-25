import { ConflictException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { and, eq, ne } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDb } from '../db/db.module';
import { organization, landingPage } from '../db/schema';
import type { LandingPageDto } from '@hxroom/shared';

@Injectable()
export class LandingPageService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async get(organizationId: string) {
    const [row] = await this.db
      .select({
        subdomain:   organization.slug,
        profileName: organization.name,
        tagline:     landingPage.tagline,
        bio:         landingPage.bio,
        ctaButton:   landingPage.ctaButton,
        ctaIntro:    landingPage.ctaIntro,
      })
      .from(organization)
      .leftJoin(landingPage, eq(landingPage.organizationId, organization.id))
      .where(eq(organization.id, organizationId))
      .limit(1);

    if (!row) {
      throw new UnauthorizedException('Organization not found');
    }

    return row;
  }

  async update(organizationId: string, dto: LandingPageDto) {
    if (dto.subdomain !== undefined) {
      const [conflict] = await this.db
        .select({ id: organization.id })
        .from(organization)
        .where(and(eq(organization.slug, dto.subdomain), ne(organization.id, organizationId)))
        .limit(1);

      if (conflict) {
        throw new ConflictException('Subdomain is already taken');
      }
    }

    await this.db.transaction(async (tx) => {
      if (dto.subdomain !== undefined || dto.profileName !== undefined) {
        await tx
          .update(organization)
          .set({
            ...(dto.subdomain !== undefined && { slug: dto.subdomain }),
            ...(dto.profileName !== undefined && { name: dto.profileName }),
          })
          .where(eq(organization.id, organizationId));
      }

      await tx
        .insert(landingPage)
        .values({
          organizationId,
          tagline:   dto.tagline ?? null,
          bio:       dto.bio ?? null,
          ctaButton: dto.ctaButton ?? null,
          ctaIntro:  dto.ctaIntro ?? null,
        })
        .onConflictDoUpdate({
          target: landingPage.organizationId,
          set: {
            ...(dto.tagline   !== undefined && { tagline:   dto.tagline ?? null }),
            ...(dto.bio       !== undefined && { bio:       dto.bio ?? null }),
            ...(dto.ctaButton !== undefined && { ctaButton: dto.ctaButton ?? null }),
            ...(dto.ctaIntro  !== undefined && { ctaIntro:  dto.ctaIntro ?? null }),
          },
        });
    });

    return this.get(organizationId);
  }
}
