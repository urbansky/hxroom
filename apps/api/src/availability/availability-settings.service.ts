import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDb } from '../db/db.module';
import { organization, availabilitySettings } from '../db/schema';
import type { AvailabilitySettingsDto } from '@hxroom/shared';

@Injectable()
export class AvailabilitySettingsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async get(organizationId: string) {
    const [row] = await this.db
      .select({
        bufferMinutes:    availabilitySettings.bufferMinutes,
        minLeadTimeHours: availabilitySettings.minLeadTimeHours,
      })
      .from(organization)
      .leftJoin(availabilitySettings, eq(availabilitySettings.organizationId, organization.id))
      .where(eq(organization.id, organizationId))
      .limit(1);

    if (!row) {
      throw new UnauthorizedException('Organization not found');
    }

    return {
      bufferMinutes:    row.bufferMinutes ?? 0,
      minLeadTimeHours: row.minLeadTimeHours ?? 0,
    };
  }

  async update(organizationId: string, dto: AvailabilitySettingsDto) {
    await this.db
      .insert(availabilitySettings)
      .values({
        organizationId,
        bufferMinutes:    dto.bufferMinutes ?? 0,
        minLeadTimeHours: dto.minLeadTimeHours ?? 0,
      })
      .onConflictDoUpdate({
        target: availabilitySettings.organizationId,
        set: {
          ...(dto.bufferMinutes    !== undefined && { bufferMinutes:    dto.bufferMinutes }),
          ...(dto.minLeadTimeHours !== undefined && { minLeadTimeHours: dto.minLeadTimeHours }),
        },
      });

    return this.get(organizationId);
  }
}
