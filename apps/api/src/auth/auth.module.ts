import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { betterAuth, generateId } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { organization } from 'better-auth/plugins';
import { eq } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDb } from '../db/db.module';
import { MailModule } from '../mail/mail.module';
import { MailService } from '../mail/mail.service';
import { renderEmailVerificationEmail } from '../mail/templates/coach/email-verification';
import * as schema from '../db/schema';

export const AUTH = Symbol('AUTH');
export type Auth = ReturnType<typeof betterAuth>;

@Global()
@Module({
  imports: [MailModule],
  providers: [
    {
      provide: AUTH,
      inject: [DRIZZLE, ConfigService, MailService],
      useFactory: (db: DrizzleDb, config: ConfigService, mail: MailService) =>
        betterAuth({
          database: drizzleAdapter(db, {
            provider: 'pg',
            schema: { ...schema },
          }),
          plugins: [
            organization({
              allowUserToCreateOrganization: false,
              creatorRole: 'owner',
            }),
          ],
          databaseHooks: {
            user: {
              create: {
                after: async (user) => {
                  const baseSlug = generateSlug(user.name ?? user.email);
                  const slug = await ensureUniqueSlug(baseSlug, db);
                  const orgId = generateId();
                  await db.insert(schema.organization).values({
                    id: orgId,
                    name: user.name ?? 'Mein Coaching',
                    slug,
                    createdAt: new Date(),
                  });
                  await db.insert(schema.member).values({
                    id: generateId(),
                    organizationId: orgId,
                    userId: user.id,
                    role: 'owner',
                    createdAt: new Date(),
                  });
                },
              },
            },
            session: {
              create: {
                after: async (session) => {
                  const [membership] = await db
                    .select({ organizationId: schema.member.organizationId })
                    .from(schema.member)
                    .where(eq(schema.member.userId, session.userId))
                    .limit(1);
                  if (membership) {
                    await db
                      .update(schema.session)
                      .set({ activeOrganizationId: membership.organizationId })
                      .where(eq(schema.session.id, session.id));
                  }
                },
              },
            },
          },
          secret: config.getOrThrow<string>('BETTER_AUTH_SECRET'),
          baseURL: config.get<string>('BETTER_AUTH_URL', 'http://localhost:3000'),
          trustedOrigins: config.get<string>('CORS_ORIGINS')
            ? config.get<string>('CORS_ORIGINS')!.split(',').map((o) => o.trim())
            : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
          emailAndPassword: {
            enabled: true,
            requireEmailVerification: true,
          },
          emailVerification: {
            sendVerificationEmail: async ({ user, url }) => {
              await mail.send({
                to: { email: user.email },
                subject: 'E-Mail-Adresse bestätigen – HxRoom',
                htmlContent: await renderEmailVerificationEmail({ name: user.name, verifyUrl: url }),
              });
            },
          },
        }),
    },
  ],
  exports: [AUTH],
})
export class AuthModule {}

function generateSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

async function ensureUniqueSlug(base: string, db: DrizzleDb): Promise<string> {
  let slug = base;
  let counter = 2;
  while (true) {
    const [existing] = await db
      .select({ id: schema.organization.id })
      .from(schema.organization)
      .where(eq(schema.organization.slug, slug))
      .limit(1);
    if (!existing) return slug;
    slug = `${base}-${counter++}`;
  }
}

