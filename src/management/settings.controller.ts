import { Body, Controller, Get, Patch, Put, UseGuards } from '@nestjs/common';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
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

class UpdateAccountEmailDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(72)
  currentPassword!: string;
}

class UpdatePasswordDto {
  @IsString()
  @MinLength(1)
  @MaxLength(72)
  currentPassword!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  newPassword!: string;
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

  @Patch('account-email')
  updateAccountEmail(@Body() body: UpdateAccountEmailDto) {
    return this.settingsService.updateEmail(body.currentPassword, body.email);
  }

  @Patch('password')
  updatePassword(@Body() body: UpdatePasswordDto) {
    this.settingsService.updatePassword(body.currentPassword, body.newPassword);
    return { updated: true };
  }
}
