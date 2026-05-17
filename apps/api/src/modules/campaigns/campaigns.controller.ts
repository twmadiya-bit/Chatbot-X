import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CampaignsService } from './campaigns.service';
import type { CreateCampaignDto } from '@chatbot-x/shared';
import type { OutboundCampaign } from '@chatbot-x/database';

@UseGuards(JwtAuthGuard)
@Controller('chatbots/:chatbotId/campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Get()
  async list(
    @CurrentTenant() tenantId: string,
    @Param('chatbotId') chatbotId: string,
  ): Promise<OutboundCampaign[]> {
    return this.campaignsService.list(tenantId, chatbotId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentTenant() tenantId: string,
    @Param('chatbotId') chatbotId: string,
    @Body() dto: CreateCampaignDto,
  ): Promise<OutboundCampaign> {
    return this.campaignsService.create(tenantId, chatbotId, dto);
  }

  @Post(':id/activate')
  @HttpCode(HttpStatus.OK)
  async activate(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<OutboundCampaign> {
    return this.campaignsService.activate(tenantId, id);
  }

  @Post(':id/pause')
  @HttpCode(HttpStatus.OK)
  async pause(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<OutboundCampaign> {
    return this.campaignsService.pause(tenantId, id);
  }
}
