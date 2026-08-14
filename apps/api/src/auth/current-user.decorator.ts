import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role?: string | null;
}

/** Der eingeloggte User aus der Session. Setzt AuthGuard oder AdminGuard voraus. */
export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) =>
    ctx.switchToHttp().getRequest().session?.user as SessionUser | undefined,
);
