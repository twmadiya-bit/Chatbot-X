import { Controller, Get, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from './guards/admin.guard';

@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  async getStats() {
    return { success: true, data: await this.adminService.getPlatformStats() };
  }

  @Get('tenants')
  async listTenants(@Query('page') page = 1, @Query('limit') limit = 20) {
    return { success: true, data: await this.adminService.listTenants(+page, +limit) };
  }

  @Patch('tenants/:id/suspend')
  async suspendTenant(@Param('id') id: string) {
    return { success: true, data: await this.adminService.suspendTenant(id) };
  }

  @Patch('tenants/:id/activate')
  async activateTenant(@Param('id') id: string) {
    return { success: true, data: await this.adminService.activateTenant(id) };
  }

  @Get('audit-logs')
  async listAuditLogs(
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('tenantId') tenantId?: string,
  ) {
    return { success: true, data: await this.adminService.listAuditLogs(+page, +limit, tenantId) };
  }

  @Get('industries')
  async listIndustries() {
    return { success: true, data: await this.adminService.listIndustries() };
  }

  @Get('models')
  async listModels() {
    return { success: true, data: await this.adminService.listModels() };
  }

  @Patch('models/:modelId/pricing')
  async updatePricing(
    @Param('modelId') modelId: string,
    @Body() body: { inputCostPerMillion: number; outputCostPerMillion: number },
  ) {
    return {
      success: true,
      data: await this.adminService.updateModelPricing(modelId, body.inputCostPerMillion, body.outputCostPerMillion),
    };
  }

  @Get('settings')
  async getSettings() {
    return { success: true, data: await this.adminService.getPlatformSettings() };
  }

  @Patch('settings')
  async updateSettings(@Body() body: { defaultMarkupPct?: number; setupFeeWidget?: number }) {
    return { success: true, data: await this.adminService.updatePlatformSettings(body) };
  }
}
