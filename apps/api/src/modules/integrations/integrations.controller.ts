import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { IntegrationsService, ConnectIntegrationDto } from './integrations.service';
import type { IntegrationProvider, TenantIntegration } from '@chatbot-x/database';

@UseGuards(JwtAuthGuard)
@Controller()
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Get('integrations/providers')
  async listProviders(): Promise<IntegrationProvider[]> {
    return this.integrationsService.listProviders();
  }

  @Get('chatbots/:chatbotId/integrations')
  async listConnected(
    @CurrentTenant() tenantId: string,
    @Param('chatbotId') chatbotId: string,
  ): Promise<TenantIntegration[]> {
    return this.integrationsService.listConnected(tenantId, chatbotId);
  }

  @Post('chatbots/:chatbotId/integrations')
  @HttpCode(HttpStatus.CREATED)
  async connect(
    @CurrentTenant() tenantId: string,
    @Param('chatbotId') chatbotId: string,
    @Body() dto: ConnectIntegrationDto,
  ): Promise<TenantIntegration> {
    return this.integrationsService.connect(tenantId, chatbotId, dto.providerId, dto.credentials);
  }

  @Delete('chatbots/:chatbotId/integrations/:integrationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async disconnect(
    @CurrentTenant() tenantId: string,
    @Param('integrationId') integrationId: string,
  ): Promise<void> {
    return this.integrationsService.disconnect(tenantId, integrationId);
  }

  @Post('chatbots/:chatbotId/integrations/:integrationId/sync')
  @HttpCode(HttpStatus.ACCEPTED)
  async triggerSync(
    @CurrentTenant() tenantId: string,
    @Param('integrationId') integrationId: string,
  ): Promise<{ message: string }> {
    await this.integrationsService.triggerSync(tenantId, integrationId);
    return { message: 'Sync job queued' };
  }
}
