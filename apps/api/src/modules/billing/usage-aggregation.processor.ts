import { Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { prisma } from '@chatbot-x/database';
import { BillingService } from './billing.service';
import { BillingStatus } from '@chatbot-x/database';

export interface UsageJobData {
  tenantId: string;
  chatbotId: string;
  inputTokens: number;
  outputTokens: number;
  modelId: string;
  timestamp: string;
}

@Processor('usage-aggregation')
export class UsageAggregationProcessor
  extends WorkerHost
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(UsageAggregationProcessor.name);
  private aggregationInterval: NodeJS.Timeout | null = null;

  constructor(private readonly billingService: BillingService) {
    super();
  }

  onModuleInit(): void {
    // Run aggregation at the top of every hour (checks every minute, fires when minute === 0)
    const ONE_MINUTE_MS = 60 * 1000;
    this.aggregationInterval = setInterval(() => {
      const now = new Date();
      if (now.getMinutes() === 0) {
        this.aggregateHourlyToMonthly().catch((err: Error) => {
          this.logger.error(`Hourly aggregation failed: ${err.message}`);
        });
      }
    }, ONE_MINUTE_MS);
    this.logger.log('Usage aggregation scheduler started (checks every minute, fires on the hour)');
  }

  onModuleDestroy(): void {
    if (this.aggregationInterval) {
      clearInterval(this.aggregationInterval);
      this.aggregationInterval = null;
    }
  }

  async process(job: Job<UsageJobData>): Promise<void> {
    const { tenantId, chatbotId, inputTokens, outputTokens, modelId, timestamp } = job.data;

    this.logger.debug(
      `Processing usage job ${job.id}: tenant=${tenantId} chatbot=${chatbotId} in=${inputTokens} out=${outputTokens}`,
    );

    const jobTime = new Date(timestamp);
    const hour = new Date(
      jobTime.getFullYear(),
      jobTime.getMonth(),
      jobTime.getDate(),
      jobTime.getHours(),
      0,
      0,
      0,
    );

    const cost = await this.billingService.calculateCost(inputTokens, outputTokens, modelId);

    const totalTokens = inputTokens + outputTokens;

    await prisma.usageHourly.upsert({
      where: {
        tenantId_chatbotId_hour: { tenantId, chatbotId, hour },
      },
      create: {
        tenantId,
        chatbotId,
        hour,
        inputTokens: BigInt(inputTokens),
        outputTokens: BigInt(outputTokens),
        totalTokens: BigInt(totalTokens),
        messageCount: 1,
        conversationCount: 0,
        rawCostUsd: cost.rawCostUsd,
        billedCostUsd: cost.billedCostUsd,
      },
      update: {
        inputTokens: { increment: BigInt(inputTokens) },
        outputTokens: { increment: BigInt(outputTokens) },
        totalTokens: { increment: BigInt(totalTokens) },
        messageCount: { increment: 1 },
        rawCostUsd: { increment: cost.rawCostUsd },
        billedCostUsd: { increment: cost.billedCostUsd },
      },
    });

    this.logger.debug(
      `Upserted UsageHourly for tenant=${tenantId} chatbot=${chatbotId} hour=${hour.toISOString()}`,
    );
  }

  async aggregateHourlyToMonthly(): Promise<void> {
    this.logger.log('Running hourly → monthly usage aggregation');

    const now = new Date();
    const currentHour = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      now.getHours(),
      0,
      0,
      0,
    );

    const oneHourAgo = new Date(currentHour.getTime() - 60 * 60 * 1000);
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const hourlyRecords = await prisma.usageHourly.findMany({
      where: {
        hour: {
          gte: oneHourAgo,
          lt: currentHour,
        },
      },
    });

    if (hourlyRecords.length === 0) {
      this.logger.debug('No hourly records to aggregate');
      return;
    }

    const byTenant = new Map<
      string,
      {
        totalInputTokens: bigint;
        totalOutputTokens: bigint;
        totalTokens: bigint;
        totalMessages: number;
        totalConversations: number;
        rawCostUsd: number;
        billedCostUsd: number;
      }
    >();

    for (const record of hourlyRecords) {
      const existing = byTenant.get(record.tenantId);
      if (existing) {
        existing.totalInputTokens += record.inputTokens;
        existing.totalOutputTokens += record.outputTokens;
        existing.totalTokens += record.totalTokens;
        existing.totalMessages += record.messageCount;
        existing.totalConversations += record.conversationCount;
        existing.rawCostUsd += Number(record.rawCostUsd);
        existing.billedCostUsd += Number(record.billedCostUsd);
      } else {
        byTenant.set(record.tenantId, {
          totalInputTokens: record.inputTokens,
          totalOutputTokens: record.outputTokens,
          totalTokens: record.totalTokens,
          totalMessages: record.messageCount,
          totalConversations: record.conversationCount,
          rawCostUsd: Number(record.rawCostUsd),
          billedCostUsd: Number(record.billedCostUsd),
        });
      }
    }

    for (const [tenantId, totals] of byTenant.entries()) {
      const existing = await prisma.usageMonthly.findFirst({
        where: {
          tenantId,
          billingPeriodStart: { gte: periodStart, lte: periodEnd },
        },
        orderBy: { billingPeriodStart: 'desc' },
      });

      if (existing) {
        await prisma.usageMonthly.update({
          where: { id: existing.id },
          data: {
            totalInputTokens: { increment: totals.totalInputTokens },
            totalOutputTokens: { increment: totals.totalOutputTokens },
            totalTokens: { increment: totals.totalTokens },
            totalMessages: { increment: totals.totalMessages },
            totalConversations: { increment: totals.totalConversations },
            rawCostUsd: { increment: totals.rawCostUsd },
            billedCostUsd: { increment: totals.billedCostUsd },
          },
        });
      } else {
        await prisma.usageMonthly.create({
          data: {
            tenantId,
            billingPeriodStart: periodStart,
            billingPeriodEnd: periodEnd,
            totalInputTokens: totals.totalInputTokens,
            totalOutputTokens: totals.totalOutputTokens,
            totalTokens: totals.totalTokens,
            totalMessages: totals.totalMessages,
            totalConversations: totals.totalConversations,
            rawCostUsd: totals.rawCostUsd,
            billedCostUsd: totals.billedCostUsd,
            status: BillingStatus.PENDING,
          },
        });
      }

      this.logger.debug(
        `Aggregated usage for tenant ${tenantId}: ${totals.totalMessages} messages`,
      );
    }

    this.logger.log(`Aggregation complete for ${byTenant.size} tenants`);
  }
}
