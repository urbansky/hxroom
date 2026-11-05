import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { fromNodeHeaders } from 'better-auth/node';
import { AUTH, type Auth } from './auth.module';
import { ActivityTracker } from './activity-tracker';
import { setRequestActor } from '../common/logging/request-context';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(AUTH) private readonly auth: Auth,
    private readonly activity: ActivityTracker,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const session = await this.auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session) {
      throw new UnauthorizedException('Nicht angemeldet');
    }

    req.session = session;
    const activeOrgId = (session.session as Record<string, unknown>)
      .activeOrganizationId as string | undefined;
    const impersonatedBy = (session.session as Record<string, unknown>)
      .impersonatedBy as string | null | undefined;
    setRequestActor({ userId: session.user.id, organizationId: activeOrgId, impersonatedBy });
    if (activeOrgId) {
      req.organization = { id: activeOrgId };
      // Nur Coachs: Ein Betreiber hat keine Organisation und erscheint in keiner Coach-Liste.
      this.activity.touch(session.user.id, impersonatedBy);
    }
    return true;
  }
}
