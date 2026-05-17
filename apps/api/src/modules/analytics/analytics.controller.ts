import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import {
  AnalyticsService,
  Period,
  GroupBy,
  DashboardMetrics,
  UsageChartPoint,
  ConversationListItem,
  SentimentPoint,
  RevenueConversation,
} from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { ApiResponse, PaginatedResponse } from '@chatbot-x/shared';
import { ConversationStatus } from '@chatbot-x/database';

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get dashboard metrics' })
  @ApiQuery({ name: 'chatbotId', required: false })
  @ApiQuery({ name: 'period', required: false, enum: ['7d', '30d', '90d'] })
  async getDashboardMetrics(
    @CurrentTenant() tenantId: string,
    @Query('chatbotId') chatbotId?: string,
    @Query('period') period?: Period,
  ): Promise<ApiResponse<DashboardMetrics>> {
    const data = await this.analyticsService.getDashboardMetrics(tenantId, chatbotId, period);
    return { success: true, data };
  }

  @Get('usage')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get usage chart data' })
  @ApiQuery({ name: 'chatbotId', required: false })
  @ApiQuery({ name: 'groupBy', required: false, enum: ['day', 'hour'] })
  async getUsageChart(
    @CurrentTenant() tenantId: string,
    @Query('chatbotId') chatbotId?: string,
    @Query('groupBy') groupBy?: GroupBy,
  ): Promise<ApiResponse<UsageChartPoint[]>> {
    const data = await this.analyticsService.getUsageChart(tenantId, chatbotId, groupBy);
    return { success: true, data };
  }

  @Get('conversations')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get paginated conversation list' })
  @ApiQuery({ name: 'chatbotId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ['OPEN', 'RESOLVED', 'ESCALATED', 'ABANDONED'] })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getConversationList(
    @CurrentTenant() tenantId: string,
    @Query('chatbotId') chatbotId?: string,
    @Query('status') status?: ConversationStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<ApiResponse<PaginatedResponse<ConversationListItem>>> {
    const data = await this.analyticsService.getConversationList(
      tenantId,
      chatbotId,
      { status },
      {
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
      },
    );
    return { success: true, data };
  }

  @Get('conversations/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get conversation detail with messages' })
  async getConversationDetail(
    @CurrentTenant() tenantId: string,
    @Param('id') conversationId: string,
  ): Promise<ApiResponse<object>> {
    const data = await this.analyticsService.getConversationDetail(tenantId, conversationId);
    return { success: true, data };
  }

  @Get('sentiment')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get sentiment trend over time' })
  @ApiQuery({ name: 'chatbotId', required: false })
  @ApiQuery({ name: 'period', required: false, enum: ['7d', '30d', '90d'] })
  async getSentimentTrend(
    @CurrentTenant() tenantId: string,
    @Query('chatbotId') chatbotId?: string,
    @Query('period') period?: Period,
  ): Promise<ApiResponse<SentimentPoint[]>> {
    const data = await this.analyticsService.getSentimentTrend(tenantId, chatbotId, period);
    return { success: true, data };
  }

  @Get('revenue')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get revenue attribution (converted conversations)' })
  @ApiQuery({ name: 'chatbotId', required: false })
  async getRevenueAttribution(
    @CurrentTenant() tenantId: string,
    @Query('chatbotId') chatbotId?: string,
  ): Promise<ApiResponse<RevenueConversation[]>> {
    const data = await this.analyticsService.getRevenueAttribution(tenantId, chatbotId);
    return { success: true, data };
  }
}
