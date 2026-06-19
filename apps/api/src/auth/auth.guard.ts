import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { fromNodeHeaders } from 'better-auth/node';
import { AUTH, type Auth } from './auth.module';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(@Inject(AUTH) private readonly auth: Auth) {}

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
    if (activeOrgId) {
      req.organization = { id: activeOrgId };
    }
    return true;
  }
}
