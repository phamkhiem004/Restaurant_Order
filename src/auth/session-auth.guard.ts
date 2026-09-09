import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService, SESSION_COOKIE } from './auth.service';
import type { AuthenticatedRequest } from './auth.types';

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.readCookie(request.headers.cookie, SESSION_COOKIE);
    if (!token) throw new UnauthorizedException('Bạn chưa đăng nhập.');

    const user = await this.authService.getSession(token);
    if (!user) {
      throw new UnauthorizedException('Phiên đăng nhập đã hết hạn.');
    }
    (request as AuthenticatedRequest).user = user;
    return true;
  }

  private readCookie(cookieHeader: string | undefined, name: string) {
    if (!cookieHeader) return undefined;
    for (const cookie of cookieHeader.split(';')) {
      const [key, ...value] = cookie.trim().split('=');
      if (key === name) return decodeURIComponent(value.join('='));
    }
    return undefined;
  }
}
