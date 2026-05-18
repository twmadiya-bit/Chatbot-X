import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  Headers,
  RawBodyRequest,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { ApiResponse } from '@chatbot-x/shared';

@ApiTags('billing')
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stripe webhook endpoint (no JWT)' })
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ): Promise<{ received: boolean }> {
    const rawBody = req.rawBody;
    if (!rawBody) {
      return { received: false };
    }
    await this.billingService.handleStripeWebhook(rawBody, signature);
    return { received: true };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('setup-fee/:chatbotId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create setup fee PaymentIntent for a chatbot' })
  async createSetupFeePaymentIntent(
    @CurrentTenant() tenantId: string,
    @Param('chatbotId') chatbotId: string,
  ): Promise<ApiResponse<{ clientSecret: string }>> {
    const data = await this.billingService.createSetupFeePaymentIntent(tenantId, chatbotId);
    return { success: true, data };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('subscribe/:chatbotId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create a Stripe subscription for a chatbot' })
  async createSubscription(
    @CurrentTenant() tenantId: string,
    @Param('chatbotId') chatbotId: string,
    @Body() body: { industryPlanId: string },
  ): Promise<ApiResponse<void>> {
    await this.billingService.createSubscription(tenantId, chatbotId, body.industryPlanId);
    return { success: true };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('usage')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get current billing period usage' })
  async getCurrentUsage(@CurrentTenant() tenantId: string): Promise<ApiResponse<object>> {
    const data = await this.billingService.getCurrentUsage(tenantId);
    return { success: true, data };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('history')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get billing history (past UsageMonthly records)' })
  async getBillingHistory(@CurrentTenant() tenantId: string): Promise<ApiResponse<object[]>> {
    const data = await this.billingService.getBillingHistory(tenantId);
    return { success: true, data };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('portal')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create Stripe Billing Portal session URL' })
  async createPortalSession(@CurrentTenant() tenantId: string): Promise<ApiResponse<{ url: string }>> {
    const data = await this.billingService.createPortalSession(tenantId);
    return { success: true, data };
  }

  @Get('plans')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all industry plans (public)' })
  async getAllPlans(): Promise<ApiResponse<object[]>> {
    const data = await this.billingService.getAllPlans();
    return { success: true, data };
  }
}
