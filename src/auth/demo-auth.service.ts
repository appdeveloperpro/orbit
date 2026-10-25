import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

const DEMO_EMAIL = 'demo@unilevel.test';
const DEMO_PASSWORD = 'Demo123!';
const TOKEN_LIFETIME_MS = 60 * 60 * 1000;

@Injectable()
export class DemoAuthService {
  private readonly sessions = new Map<string, number>();
  private email = DEMO_EMAIL;
  private password = DEMO_PASSWORD;

  login(email: string, password: string): { accessToken: string; tokenType: string; expiresIn: number } | null {
    if (email.toLowerCase() !== this.email || password !== this.password) {
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

  getEmail(): string {
    return this.email;
  }

  hasDefaultPassword(): boolean {
    return this.password === DEMO_PASSWORD;
  }

  updateEmail(currentPassword: string, email: string): void {
    this.verifyPassword(currentPassword);
    this.email = email.toLowerCase();
  }

  updatePassword(currentPassword: string, newPassword: string): void {
    this.verifyPassword(currentPassword);
    if (newPassword === this.password) {
      throw new BadRequestException('Choose a password different from the current password');
    }
    this.password = newPassword;
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

  private verifyPassword(password: string): void {
    if (password !== this.password) {
      throw new ForbiddenException('Current password is incorrect');
    }
  }
}
