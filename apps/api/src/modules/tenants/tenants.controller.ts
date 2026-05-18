import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TenantsService, UpdateProfileDto } from './tenants.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { ApiResponse } from '@chatbot-x/shared';
import { Tenant, NotificationPreference } from '@chatbot-x/database';

@ApiTags('tenants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get current tenant profile' })
  async getProfile(@CurrentTenant() tenantId: string): Promise<ApiResponse<Omit<Tenant, 'passwordHash'>>> {
    const tenant = await this.tenantsService.findById(tenantId);
    const { passwordHash: _hash, ...profile } = tenant;
    return { success: true, data: profile };
  }

  @Patch('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update current tenant profile' })
  async updateProfile(
    @CurrentTenant() tenantId: string,
    @Body() dto: UpdateProfileDto,
  ): Promise<ApiResponse<Omit<Tenant, 'passwordHash'>>> {
    const tenant = await this.tenantsService.updateProfile(tenantId, dto);
    const { passwordHash: _hash, ...profile } = tenant;
    return { success: true, data: profile };
  }

  @Get('me/usage')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get usage summary for current billing period' })
  async getUsageSummary(@CurrentTenant() tenantId: string): Promise<ApiResponse<unknown>> {
    const usage = await this.tenantsService.getUsageSummary(tenantId);
    return { success: true, data: usage ?? null };
  }

  @Get('me/notification-preferences')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get notification preferences' })
  async getNotificationPreferences(
    @CurrentTenant() tenantId: string,
  ): Promise<ApiResponse<NotificationPreference | null>> {
    const prefs = await this.tenantsService.getNotificationPreferences(tenantId);
    return { success: true, data: prefs };
  }

  @Patch('me/notification-preferences')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update notification preferences' })
  async updateNotificationPreferences(
    @CurrentTenant() tenantId: string,
    @Body() dto: Partial<Pick<NotificationPreference, 'billingEmails' | 'usageReportEmails' | 'handoffEmails' | 'sentimentAlertEmails'>>,
  ): Promise<ApiResponse<NotificationPreference>> {
    const prefs = await this.tenantsService.upsertNotificationPreferences(tenantId, dto);
    return { success: true, data: prefs };
  }
}
