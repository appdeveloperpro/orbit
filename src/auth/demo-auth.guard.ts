import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { DemoAuthService } from './demo-auth.service';

@Injectable()
export class DemoAuthGuard implements CanActivate {
  constructor(private readonly authService: DemoAuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ headers: { authorization?: string } }>();
    const authorization = request.headers.authorization;
    const [scheme, token] = authorization?.split(' ') ?? [];

    if (scheme !== 'Bearer' || !token || !this.authService.isTokenValid(token)) {
      throw new UnauthorizedException('A valid demo bearer token is required');
    }

    return true;
  }
}
