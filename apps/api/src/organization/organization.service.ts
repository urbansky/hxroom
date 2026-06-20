import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDb } from '../db/db.module';
import { organization } from '../db/schema';

@Injectable()
export class OrganizationService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async findBySlug(slug: string) {
    const [org] = await this.db
      .select({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        logo: organization.logo,
      })
      .from(organization)
      .where(eq(organization.slug, slug))
      .limit(1);

    if (!org) {
      throw new NotFoundException(`Kein Coach mit dem Slug „${slug}" gefunden`);
    }

    return org;
  }
}
