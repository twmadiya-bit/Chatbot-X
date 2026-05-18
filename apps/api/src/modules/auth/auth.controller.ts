import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Redirect,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService, LoginResult, AuthTokens } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthGuard } from '@nestjs/passport';
import { RegisterTenantDto } from '@chatbot-x/shared';
import { ApiResponse } from '@chatbot-x/shared';
import { Tenant } from '@chatbot-x/database';
import { Request as ExpressRequest } from 'express';

interface RequestWithTenant extends ExpressRequest {
  user: Tenant;
}

interface RequestWithJwtRefreshUser extends ExpressRequest {
  user: {
    tenantId: string;
    email: string;
    role: string;
    refreshToken: string;
  };
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new tenant account' })
  async register(@Body() dto: RegisterTenantDto): Promise<ApiResponse<LoginResult>> {
    const result = await this.authService.register(dto);
    return { success: true, data: result };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(LocalAuthGuard)
  @ApiOperation({ summary: 'Authenticate with email and password' })
  async login(@Request() req: RequestWithTenant): Promise<ApiResponse<LoginResult>> {
    const result = await this.authService.login(req.user);
    return { success: true, data: result };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt-refresh'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  async refresh(@Request() req: RequestWithJwtRefreshUser): Promise<ApiResponse<AuthTokens>> {
    const { tenantId, refreshToken } = req.user;
    const tokens = await this.authService.refreshTokens(tenantId, refreshToken);
    return { success: true, data: tokens };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout (client should discard tokens)' })
  logout(): ApiResponse<null> {
    return { success: true, data: null, message: 'Logged out successfully' };
  }

  @Post('request-password-reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a password reset email' })
  async requestPasswordReset(@Body() body: { email: string }): Promise<ApiResponse<null>> {
    await this.authService.requestPasswordReset(body.email);
    return { success: true, data: null, message: 'If this email is registered, a reset link has been sent.' };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using a reset token' })
  async resetPassword(@Body() body: { token: string; password: string }): Promise<ApiResponse<null>> {
    await this.authService.resetPassword(body.token, body.password);
    return { success: true, data: null, message: 'Password reset successfully.' };
  }

  @Get('verify-email')
  @Redirect()
  @ApiOperation({ summary: 'Verify email address (link from email)' })
  async verifyEmailGet(@Query('token') token: string) {
    try {
      await this.authService.verifyEmail(token);
      const dashboardUrl = process.env.DASHBOARD_URL ?? 'http://localhost:3000';
      return { url: `${dashboardUrl}/login?verified=1` };
    } catch {
      const dashboardUrl = process.env.DASHBOARD_URL ?? 'http://localhost:3000';
      return { url: `${dashboardUrl}/login?verified=0` };
    }
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email address using a verification token' })
  async verifyEmail(@Body() body: { token: string }): Promise<ApiResponse<null>> {
    await this.authService.verifyEmail(body.token);
    return { success: true, data: null, message: 'Email verified successfully.' };
  }
}
