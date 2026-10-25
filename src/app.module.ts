import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'node:path';
import { AuthController } from './auth/auth.controller';
import { DemoAuthGuard } from './auth/demo-auth.guard';
import { DemoAuthService } from './auth/demo-auth.service';
import { CommissionsController } from './commissions/commissions.controller';
import { CommissionService } from './commissions/commission.service';
import { MembersController } from './members/members.controller';
import { MembersService } from './members/members.service';
import { CommerceController } from './management/commerce.controller';
import { RankController } from './management/rank.controller';
import { RankService } from './management/rank.service';
import { SettingsController } from './management/settings.controller';
import { SettingsService } from './management/settings.service';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'web-dist'),
      exclude: ['/api', '/api/{*path}'],
    }),
  ],
  controllers: [AuthController, MembersController, CommissionsController, CommerceController, RankController, SettingsController],
  providers: [DemoAuthService, DemoAuthGuard, MembersService, CommissionService, RankService, SettingsService],
})
export class AppModule {}
