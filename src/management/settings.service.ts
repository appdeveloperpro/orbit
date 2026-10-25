import { Injectable } from '@nestjs/common';
import { AdminSettings } from './settings.model';

@Injectable()
export class SettingsService {
  private settings: AdminSettings = {
    workspaceName: 'Northstar Network',
    adminName: 'Alex Demo',
  };

  get(): AdminSettings {
    return this.settings;
  }

  update(settings: AdminSettings): AdminSettings {
    this.settings = settings;
    return this.settings;
  }
}
