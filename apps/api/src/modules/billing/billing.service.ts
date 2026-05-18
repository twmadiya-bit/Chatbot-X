import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import Stripe from 'stripe';
import { prisma } from '@chatbot-x/database';
import { PaymentStatus, BillingStatus, SubscriptionStatus } from '@chatbot-x/database';
import { NotificationsService } from '../notifications/notifications.service';

export interface CalculatedCost {
  rawCostUsd: number;
  billedCostUsd: number;
  markupPct: number;
}

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private readonly stripe: Stripe;

  constructor(
    private readonly config: ConfigService,
    private readonly notifications: NotificationsService,
    @InjectQueue('usage-aggregation') private readonly usageAggregationQueue: Queue,
  ) {
    this.stripe = new Stripe(this.config.get<string>('app.stripeSecretKey', ''), {
      apiVersion: '2025-02-24.acacia',
    });
  }

  async createSetupFeePaymentIntent(
    tenantId: string,
    chatbotId: string,
  ): Promise<{ clientSecret: string }> {
    const chatbot = await prisma.chatbot.findFirst({
      where: { id: chatbotId, tenantId },
      include: { industryPlan: true },
    });

    if (!chatbot) {
      throw new NotFoundException('Chatbot not found');
    }

    if (!chatbot.industryPlan) {
      throw new BadRequestException('Chatbot has no industry plan assigned');
    }

    const existingPayment = await prisma.setupFeePayment.findUnique({
      where: { chatbotId },
    });

    if (existingPayment && existingPayment.status === PaymentStatus.PAID) {
      throw new BadRequestException('Setup fee already paid for this chatbot');
    }

    const amountCents = Math.round(Number(chatbot.industryPlan.setupFeeUsd) * 100);

    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      metadata: { tenantId, chatbotId },
    });

    if (!paymentIntent.client_secret) {
      throw new InternalServerErrorException('Failed to create payment intent');
    }

    if (existingPayment) {
      await prisma.setupFeePayment.update({
        where: { chatbotId },
        data: {
          stripePaymentIntentId: paymentIntent.id,
          amountUsd: chatbot.industryPlan.setupFeeUsd,
          status: PaymentStatus.PENDING,
        },
      });
    } else {
      await prisma.setupFeePayment.create({
        data: {
          tenantId,
          chatbotId,
          stripePaymentIntentId: paymentIntent.id,
          amountUsd: chatbot.industryPlan.setupFeeUsd,
          status: PaymentStatus.PENDING,
        },
      });
    }

    this.logger.log(`Created setup fee payment intent for chatbot ${chatbotId}, amount: $${chatbot.industryPlan.setupFeeUsd}`);

    return { clientSecret: paymentIntent.client_secret };
  }

  async createSubscription(
    tenantId: string,
    chatbotId: string,
    industryPlanId: string,
  ): Promise<void> {
    const [chatbot, tenant, industryPlan] = await Promise.all([
      prisma.chatbot.findFirst({ where: { id: chatbotId, tenantId } }),
      prisma.tenant.findUnique({ where: { id: tenantId } }),
      prisma.industryPlan.findUnique({ where: { id: industryPlanId } }),
    ]);

    if (!chatbot) throw new NotFoundException('Chatbot not found');
    if (!tenant) throw new NotFoundException('Tenant not found');
    if (!industryPlan) throw new NotFoundException('Industry plan not found');

    if (!industryPlan.stripePriceId) {
      throw new BadRequestException('Industry plan has no Stripe price configured');
    }

    let stripeCustomerId = tenant.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await this.stripe.customers.create({
        email: tenant.email,
        name: tenant.name,
        metadata: { tenantId },
      });
      stripeCustomerId = customer.id;
      await prisma.tenant.update({
        where: { id: tenantId },
        data: { stripeCustomerId },
      });
      this.logger.log(`Created Stripe customer ${stripeCustomerId} for tenant ${tenantId}`);
    }

    const stripeSubscription = await this.stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [{ price: industryPlan.stripePriceId }],
      metadata: { tenantId, chatbotId, industryPlanId },
    });

    const now = new Date();
    const periodStart = new Date(stripeSubscription.current_period_start * 1000);
    const periodEnd = new Date(stripeSubscription.current_period_end * 1000);

    const existing = await prisma.chatbotSubscription.findUnique({ where: { chatbotId } });

    if (existing) {
      await prisma.chatbotSubscription.update({
        where: { chatbotId },
        data: {
          industryPlanId,
          stripeSubscriptionId: stripeSubscription.id,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          canceledAt: null,
        },
      });
    } else {
      await prisma.chatbotSubscription.create({
        data: {
          chatbotId,
          tenantId,
          industryPlanId,
          stripeSubscriptionId: stripeSubscription.id,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
        },
      });
    }

    this.logger.log(`Created subscription ${stripeSubscription.id} for chatbot ${chatbotId}`);
  }

  async handleStripeWebhook(rawBody: Buffer, signature: string): Promise<void> {
    const webhookSecret = this.config.get<string>('app.stripeWebhookSecret', '');

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err) {
      this.logger.warn(`Stripe webhook signature verification failed: ${(err as Error).message}`);
      throw new BadRequestException('Invalid webhook signature');
    }

    this.logger.log(`Processing Stripe webhook event: ${event.type}`);

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await this.handlePaymentIntentSucceeded(paymentIntent);
        break;
      }
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        await this.handleInvoicePaid(invoice);
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await this.handleSubscriptionDeleted(subscription);
        break;
      }
      default:
        this.logger.debug(`Unhandled Stripe event type: ${event.type}`);
    }
  }

  private async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const updated = await prisma.setupFeePayment.updateMany({
      where: { stripePaymentIntentId: paymentIntent.id },
      data: {
        status: PaymentStatus.PAID,
        paidAt: new Date(),
      },
    });

    if (updated.count > 0) {
      this.logger.log(`Marked setup fee payment paid for intent ${paymentIntent.id}`);
    }
  }

  private async handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
    if (!invoice.subscription) return;

    const subscription = await prisma.chatbotSubscription.findFirst({
      where: { stripeSubscriptionId: String(invoice.subscription) },
    });

    if (!subscription) {
      this.logger.warn(`No subscription found for Stripe subscription ${invoice.subscription}`);
      return;
    }

    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const existing = await prisma.usageMonthly.findFirst({
      where: {
        tenantId: subscription.tenantId,
        billingPeriodStart: { gte: periodStart },
      },
      orderBy: { billingPeriodStart: 'desc' },
    });

    if (existing) {
      await prisma.usageMonthly.update({
        where: { id: existing.id },
        data: {
          stripeInvoiceId: invoice.id,
          status: BillingStatus.PAID,
        },
      });
      this.logger.log(`Marked usage monthly ${existing.id} as paid for invoice ${invoice.id}`);
    }

    // Send billing email if tenant has it enabled
    const [tenant, notifPrefs] = await Promise.all([
      prisma.tenant.findUnique({ where: { id: subscription.tenantId }, select: { email: true } }),
      prisma.notificationPreference.findUnique({ where: { tenantId: subscription.tenantId } }),
    ]);
    if (tenant && (notifPrefs?.billingEmails ?? true)) {
      const period = `${periodStart.toLocaleString('en', { month: 'long', year: 'numeric' })}`;
      const amount = invoice.amount_paid / 100;
      this.notifications.sendBillingInvoice(tenant.email, amount, period).catch(() => {});
    }
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const updated = await prisma.chatbotSubscription.updateMany({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        status: SubscriptionStatus.CANCELED,
        canceledAt: new Date(),
      },
    });

    if (updated.count > 0) {
      this.logger.log(`Canceled subscription for Stripe subscription ${subscription.id}`);
    }
  }

  async getCurrentUsage(tenantId: string): Promise<object> {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const monthly = await prisma.usageMonthly.findFirst({
      where: {
        tenantId,
        billingPeriodStart: { gte: periodStart },
      },
      orderBy: { billingPeriodStart: 'desc' },
    });

    if (monthly) {
      return monthly;
    }

    const hourStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const aggregate = await prisma.usageHourly.aggregate({
      where: {
        tenantId,
        hour: { gte: hourStart },
      },
      _sum: {
        inputTokens: true,
        outputTokens: true,
        totalTokens: true,
        rawCostUsd: true,
        billedCostUsd: true,
        messageCount: true,
        conversationCount: true,
      },
    });

    return {
      tenantId,
      billingPeriodStart: periodStart,
      billingPeriodEnd: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
      totalInputTokens: aggregate._sum.inputTokens ?? BigInt(0),
      totalOutputTokens: aggregate._sum.outputTokens ?? BigInt(0),
      totalTokens: aggregate._sum.totalTokens ?? BigInt(0),
      rawCostUsd: aggregate._sum.rawCostUsd ?? 0,
      billedCostUsd: aggregate._sum.billedCostUsd ?? 0,
      totalMessages: aggregate._sum.messageCount ?? 0,
      totalConversations: aggregate._sum.conversationCount ?? 0,
      status: BillingStatus.PENDING,
    };
  }

  async getBillingHistory(tenantId: string): Promise<object[]> {
    const records = await prisma.usageMonthly.findMany({
      where: { tenantId },
      orderBy: { billingPeriodStart: 'desc' },
      take: 24,
    });

    return records;
  }

  async createPortalSession(tenantId: string): Promise<{ url: string }> {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant?.stripeCustomerId) {
      throw new BadRequestException('No billing account found. Please subscribe first.');
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: tenant.stripeCustomerId,
      return_url: `${this.config.get('app.dashboardUrl', 'http://localhost:3000')}/billing`,
    });

    return { url: session.url };
  }

  async getAllPlans(): Promise<object[]> {
    return prisma.industryPlan.findMany({
      where: { isActive: true },
      include: {
        industry: { select: { id: true, name: true, slug: true, icon: true } },
        planFeatures: { include: { feature: { select: { key: true, name: true, featureType: true } } } },
      },
      orderBy: [{ industryId: 'asc' }, { tier: 'asc' }],
    });
  }

  async trackUsage(
    tenantId: string,
    chatbotId: string,
    inputTokens: number,
    outputTokens: number,
    modelId: string,
  ): Promise<void> {
    await this.usageAggregationQueue.add(
      'track-usage',
      { tenantId, chatbotId, inputTokens, outputTokens, modelId, timestamp: new Date().toISOString() },
      { attempts: 3, backoff: { type: 'exponential', delay: 1000 } },
    );
  }

  async calculateCost(
    inputTokens: number,
    outputTokens: number,
    modelId: string,
  ): Promise<CalculatedCost> {
    const aiModel = await prisma.aiModel.findUnique({
      where: { modelId },
      include: {
        pricing: {
          where: {
            effectiveFrom: { lte: new Date() },
            OR: [{ effectiveTo: null }, { effectiveTo: { gte: new Date() } }],
          },
          orderBy: { effectiveFrom: 'desc' },
          take: 1,
        },
      },
    });

    const platformSettings = await prisma.platformSettings.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    const markupPct = platformSettings
      ? Number(platformSettings.defaultMarkupPct)
      : this.config.get<number>('ai.defaultMarkupPct', 40);

    if (!aiModel || aiModel.pricing.length === 0) {
      this.logger.warn(`No pricing found for model ${modelId}, using zero cost`);
      return { rawCostUsd: 0, billedCostUsd: 0, markupPct };
    }

    const pricing = aiModel.pricing[0];
    const inputCostUsd = (inputTokens / 1_000_000) * Number(pricing.inputCostPerMillion);
    const outputCostUsd = (outputTokens / 1_000_000) * Number(pricing.outputCostPerMillion);
    const rawCostUsd = inputCostUsd + outputCostUsd;
    const billedCostUsd = rawCostUsd * (1 + markupPct / 100);

    return {
      rawCostUsd: Math.round(rawCostUsd * 1_000_000) / 1_000_000,
      billedCostUsd: Math.round(billedCostUsd * 1_000_000) / 1_000_000,
      markupPct,
    };
  }
}
