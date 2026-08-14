import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { fromNodeHeaders } from 'better-auth/node';
import { AUTH, type Auth } from './auth.module';
import { isAdminRole } from './roles';

/**
 * Zugang zum Betreiber-Backoffice (admin.hxroom.de).
 *
 * Bewusst kein Erben vom AuthGuard: dieser setzt req.organization aus der Session, was für
 * einen Betreiber immer leer bliebe (er ist Mitglied keiner Organisation). Die
 * Session-Auflösung ist stattdessen dupliziert – wenige Zeilen, dafür kann kein
 * Coach-Kontext an einem Admin-Endpunkt landen.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(@Inject(AUTH) private readonly auth: Auth) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const session = await this.auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session) {
      throw new UnauthorizedException('Not authenticated');
    }

    if (!isAdminRole((session.user as { role?: string | null }).role)) {
      throw new ForbiddenException('Operator access required');
    }

    req.session = session;
    return true;
  }
}
