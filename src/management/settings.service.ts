import { Injectable } from '@nestjs/common';
import { DemoAuthService } from '../auth/demo-auth.service';
import { AdminSettings } from './settings.model';

@Injectable()
export class SettingsService {
  private settings: Omit<AdminSettings, 'adminEmail'> = {
    workspaceName: 'Northstar Network',
    adminName: 'Alex Demo',
  };

  constructor(private readonly authService: DemoAuthService) {}

  get(): AdminSettings {
    return { ...this.settings, adminEmail: this.authService.getEmail() };
  }

  update(settings: Omit<AdminSettings, 'adminEmail'>): AdminSettings {
    this.settings = { ...settings };
    return this.get();
  }

  updateEmail(currentPassword: string, email: string): AdminSettings {
    this.authService.updateEmail(currentPassword, email);
    return this.get();
  }

  updatePassword(currentPassword: string, newPassword: string): void {
    this.authService.updatePassword(currentPassword, newPassword);
  }
}
