import { Body, Controller, Post, UnauthorizedException } from '@nestjs/common';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { DemoAuthService } from './demo-auth.service';

class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  password!: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: DemoAuthService) {}

  @Post('login')
  login(@Body() body: LoginDto) {
    const session = this.authService.login(body.email, body.password);
    if (!session) {
      throw new UnauthorizedException('Invalid demo credentials');
    }

    return {
      ...session,
      user: { email: 'demo@unilevel.test', role: 'demo-admin' },
    };
  }
}
