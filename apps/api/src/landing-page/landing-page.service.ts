import { BadRequestException, ConflictException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { and, eq, ne } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDb } from '../db/db.module';
import { organization, landingPage } from '../db/schema';
import type { LandingPageDto } from '@hxroom/shared';
import { S3Service, isNoSuchKeyError, type S3Object } from '../storage/s3.service';
import { coachAvatarKey } from '../storage/paths';
import { transcodeAvatar } from '../storage/image-transcode.util';

@Injectable()
export class LandingPageService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly s3: S3Service,
  ) {}

  async get(organizationId: string) {
    const [row] = await this.db
      .select({
        organizationId:  organization.id,
        subdomain:       organization.slug,
        profileName:     organization.name,
        tagline:         landingPage.tagline,
        bio:             landingPage.bio,
        ctaButton:       landingPage.ctaButton,
        ctaIntro:        landingPage.ctaIntro,
        avatarUpdatedAt: landingPage.avatarUpdatedAt,
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

  async uploadAvatar(organizationId: string, source: Buffer) {
    let transcoded: Buffer;
    try {
      transcoded = await transcodeAvatar(source);
    } catch {
      throw new BadRequestException('Uploaded file is not a valid image');
    }

    await this.s3.putObject(coachAvatarKey(organizationId), transcoded, 'image/webp');

    const avatarUpdatedAt = new Date();
    await this.db
      .insert(landingPage)
      .values({ organizationId, avatarUpdatedAt })
      .onConflictDoUpdate({
        target: landingPage.organizationId,
        set: { avatarUpdatedAt },
      });

    return { avatarUpdatedAt };
  }

  async deleteAvatar(organizationId: string): Promise<void> {
    await this.s3.deleteObject(coachAvatarKey(organizationId));
    await this.db
      .update(landingPage)
      .set({ avatarUpdatedAt: null })
      .where(eq(landingPage.organizationId, organizationId));
  }

  async getAvatarStream(organizationId: string): Promise<S3Object | null> {
    const [row] = await this.db
      .select({ avatarUpdatedAt: landingPage.avatarUpdatedAt })
      .from(landingPage)
      .where(eq(landingPage.organizationId, organizationId))
      .limit(1);

    if (!row?.avatarUpdatedAt) {
      return null;
    }

    try {
      return await this.s3.getObject(coachAvatarKey(organizationId));
    } catch (err) {
      if (isNoSuchKeyError(err)) return null;
      throw err;
    }
  }
}
