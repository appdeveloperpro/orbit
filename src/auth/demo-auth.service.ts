import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

const DEMO_EMAIL = 'demo@unilevel.test';
const DEMO_PASSWORD = 'Demo123!';
const TOKEN_LIFETIME_MS = 60 * 60 * 1000;

@Injectable()
export class DemoAuthService {
  private readonly sessions = new Map<string, number>();

  login(email: string, password: string): { accessToken: string; tokenType: string; expiresIn: number } | null {
    if (email !== DEMO_EMAIL || password !== DEMO_PASSWORD) {
      return null;
    }

    const accessToken = randomUUID();
    this.sessions.set(accessToken, Date.now() + TOKEN_LIFETIME_MS);
    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: TOKEN_LIFETIME_MS / 1000,
    };
  }

  isTokenValid(token: string): boolean {
    const expiresAt = this.sessions.get(token);
    if (expiresAt === undefined) {
      return false;
    }

    if (expiresAt <= Date.now()) {
      this.sessions.delete(token);
      return false;
    }

    return true;
  }
}
