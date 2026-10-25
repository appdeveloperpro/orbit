import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { DemoAuthGuard } from '../auth/demo-auth.guard';
import { SettingsService } from './settings.service';

class UpdateSettingsDto {
  @IsString()
  @MinLength(2)
  @MaxLength(48)
  workspaceName!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(48)
  adminName!: string;
}

@Controller('settings')
@UseGuards(DemoAuthGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  get() {
    return this.settingsService.get();
  }

  @Put()
  update(@Body() body: UpdateSettingsDto) {
    return this.settingsService.update(body);
  }
}
