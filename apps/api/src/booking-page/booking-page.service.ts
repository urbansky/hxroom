import { BadRequestException, ConflictException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { and, eq, isNull, ne } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDb } from '../db/db.module';
import { organization, bookingPage } from '../db/schema';
import type { BookingPageDto } from '@hxroom/shared';
import { S3Service, isNoSuchKeyError, type S3Object } from '../storage/s3.service';
import { coachAvatarKey } from '../storage/paths';
import { transcodeAvatar } from '../storage/image-transcode.util';

@Injectable()
export class BookingPageService {
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
        tagline:         bookingPage.tagline,
        bio:             bookingPage.bio,
        ctaButton:       bookingPage.ctaButton,
        ctaIntro:        bookingPage.ctaIntro,
        avatarUpdatedAt: bookingPage.avatarUpdatedAt,
        onboardingCelebratedAt: bookingPage.onboardingCelebratedAt,
      })
      .from(organization)
      .leftJoin(bookingPage, eq(bookingPage.organizationId, organization.id))
      .where(eq(organization.id, organizationId))
      .limit(1);

    if (!row) {
      throw new UnauthorizedException('Organization not found');
    }

    return row;
  }

  async update(organizationId: string, dto: BookingPageDto) {
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
        .insert(bookingPage)
        .values({
          organizationId,
          tagline:   dto.tagline ?? null,
          bio:       dto.bio ?? null,
          ctaButton: dto.ctaButton ?? null,
          ctaIntro:  dto.ctaIntro ?? null,
        })
        .onConflictDoUpdate({
          target: bookingPage.organizationId,
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

  /**
   * Merkt sich, dass der Coach die Erfolgsmeldung nach abgeschlossener Einrichtung
   * gesehen hat. Der Zeitpunkt wird nur gesetzt, solange die Spalte NULL ist: ein
   * zweiter Aufruf (zwei offene Tabs) soll den ursprünglichen Moment nicht überschreiben.
   */
  async markOnboardingCelebrated(organizationId: string) {
    const onboardingCelebratedAt = new Date();

    await this.db
      .insert(bookingPage)
      .values({ organizationId, onboardingCelebratedAt })
      .onConflictDoUpdate({
        target: bookingPage.organizationId,
        set: { onboardingCelebratedAt },
        setWhere: isNull(bookingPage.onboardingCelebratedAt),
      });

    const [row] = await this.db
      .select({ onboardingCelebratedAt: bookingPage.onboardingCelebratedAt })
      .from(bookingPage)
      .where(eq(bookingPage.organizationId, organizationId))
      .limit(1);

    return { onboardingCelebratedAt: row?.onboardingCelebratedAt ?? onboardingCelebratedAt };
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
      .insert(bookingPage)
      .values({ organizationId, avatarUpdatedAt })
      .onConflictDoUpdate({
        target: bookingPage.organizationId,
        set: { avatarUpdatedAt },
      });

    return { avatarUpdatedAt };
  }

  async deleteAvatar(organizationId: string): Promise<void> {
    await this.s3.deleteObject(coachAvatarKey(organizationId));
    await this.db
      .update(bookingPage)
      .set({ avatarUpdatedAt: null })
      .where(eq(bookingPage.organizationId, organizationId));
  }

  async getAvatarStream(organizationId: string): Promise<S3Object | null> {
    const [row] = await this.db
      .select({ avatarUpdatedAt: bookingPage.avatarUpdatedAt })
      .from(bookingPage)
      .where(eq(bookingPage.organizationId, organizationId))
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
