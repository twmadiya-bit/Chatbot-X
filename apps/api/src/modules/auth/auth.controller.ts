import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
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
}
