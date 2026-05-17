import { Injectable } from '@nestjs/common';
import { prisma } from '@chatbot-x/database';

@Injectable()
export class AdminService {
  async getPlatformStats() {
    const [totalTenants, activeChatbots, totalConversations, monthRevenue] = await Promise.all([
      prisma.tenant.count({ where: { status: 'ACTIVE' } }),
      prisma.chatbot.count({ where: { status: 'ACTIVE' } }),
      prisma.conversation.count({
        where: { createdAt: { gte: new Date(new Date().setDate(1)) } },
      }),
      prisma.usageMonthly.aggregate({
        where: {
          billingPeriodStart: { gte: new Date(new Date().setDate(1)) },
          status: 'PAID',
        },
        _sum: { billedCostUsd: true },
      }),
    ]);

    return {
      totalTenants,
      activeChatbots,
      totalConversations,
      monthRevenuUsd: monthRevenue._sum.billedCostUsd ?? 0,
    };
  }

  async listTenants(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      prisma.tenant.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { chatbots: true } },
        },
      }),
      prisma.tenant.count(),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async listIndustries() {
    return prisma.industry.findMany({ orderBy: { name: 'asc' } });
  }

  async listModels() {
    return prisma.aiModel.findMany({
      include: { provider: true, pricing: { where: { effectiveTo: null } } },
    });
  }

  async updateModelPricing(modelId: string, input: number, output: number) {
    await prisma.modelPricing.updateMany({
      where: { modelId, effectiveTo: null },
      data: { effectiveTo: new Date() },
    });
    return prisma.modelPricing.create({
      data: { modelId, inputCostPerMillion: input, outputCostPerMillion: output, effectiveFrom: new Date() },
    });
  }

  async getPlatformSettings() {
    return prisma.platformSettings.findFirst();
  }

  async updatePlatformSettings(data: { defaultMarkupPct?: number; setupFeeWidget?: number }) {
    const existing = await prisma.platformSettings.findFirst();
    if (existing) {
      return prisma.platformSettings.update({ where: { id: existing.id }, data });
    }
    return prisma.platformSettings.create({ data: { ...data } });
  }
}
