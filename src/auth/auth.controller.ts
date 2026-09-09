import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { AuthService, SESSION_COOKIE } from './auth.service';
import type { AuthenticatedRequest } from './auth.types';
import { LoginDto } from './dto/login.dto';
import { SessionAuthGuard } from './session-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: CreateUserDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(dto);
    response.cookie(SESSION_COOKIE, result.token, {
      httpOnly: true,
      secure: request.protocol === 'https',
      sameSite: 'lax',
      path: '/',
      maxAge: this.authService.cookieMaxAgeMilliseconds,
    });
    return { user: result.user };
  }

  @Get('me')
  @UseGuards(SessionAuthGuard)
  me(@Req() request: AuthenticatedRequest) {
    return { user: request.user };
  }

  @Post('logout')
  @UseGuards(SessionAuthGuard)
  async logout(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const token = this.readSessionCookie(request.headers.cookie);
    await this.authService.logout(token);
    response.clearCookie(SESSION_COOKIE, {
      httpOnly: true,
      secure: request.protocol === 'https',
      sameSite: 'lax',
      path: '/',
    });
    return { success: true };
  }

  private readSessionCookie(cookieHeader: string | undefined) {
    return cookieHeader
      ?.split(';')
      .map((cookie) => cookie.trim().split('='))
      .find(([key]) => key === SESSION_COOKIE)
      ?.slice(1)
      .join('=');
  }
}
