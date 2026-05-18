import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { prisma } from '@chatbot-x/database';
import { ConversationStatus, Prisma } from '@chatbot-x/database';
import { PaginatedResponse } from '@chatbot-x/shared';

export type Period = '7d' | '30d' | '90d';
export type GroupBy = 'day' | 'hour';

export interface DashboardMetrics {
  totalConversations: number;
  totalMessages: number;
  avgResponseTimeMs: number;
  resolutionRate: number;
  escalationRate: number;
  topIntents: Array<{ intent: string; count: number }>;
}

export interface UsageChartPoint {
  period: string;
  tokens: number;
  cost: number;
  messages: number;
}

export interface ConversationListItem {
  id: string;
  chatbotId: string;
  channel: string;
  endUserId: string | null;
  endUserName: string | null;
  status: string;
  sentiment: number | null;
  startedAt: Date;
  lastMessageAt: Date;
  messageCount: number;
}

export interface ConversationFilters {
  status?: ConversationStatus;
  chatbotId?: string;
}

export interface SentimentPoint {
  date: string;
  avgSentiment: number;
}

export interface RevenueConversation {
  id: string;
  chatbotId: string;
  endUserId: string | null;
  startedAt: Date;
  metadata: Prisma.JsonValue;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  private getPeriodStart(period: Period): Date {
    const now = new Date();
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const start = new Date(now);
    start.setDate(start.getDate() - days);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  private buildChatbotFilter(chatbotId?: string): Prisma.ConversationWhereInput {
    if (chatbotId) return { chatbotId };

    return {};
  }

  async getDashboardMetrics(
    tenantId: string,
    chatbotId?: string,
    period: Period = '30d',
  ): Promise<DashboardMetrics> {
    const periodStart = this.getPeriodStart(period);

    const chatbots = await prisma.chatbot.findMany({
      where: { tenantId, ...(chatbotId ? { id: chatbotId } : {}) },
      select: { id: true },
    });

    const chatbotIds = chatbots.map((c) => c.id);

    if (chatbotIds.length === 0) {
      return {
        totalConversations: 0,
        totalMessages: 0,
        avgResponseTimeMs: 0,
        resolutionRate: 0,
        escalationRate: 0,
        topIntents: [],
      };
    }

    const [totalConversations, resolvedCount, escalatedCount] = await Promise.all([
      prisma.conversation.count({
        where: {
          chatbotId: { in: chatbotIds },
          createdAt: { gte: periodStart },
        },
      }),
      prisma.conversation.count({
        where: {
          chatbotId: { in: chatbotIds },
          createdAt: { gte: periodStart },
          status: ConversationStatus.RESOLVED,
        },
      }),
      prisma.conversation.count({
        where: {
          chatbotId: { in: chatbotIds },
          createdAt: { gte: periodStart },
          status: ConversationStatus.ESCALATED,
        },
      }),
    ]);

    const messageAgg = await prisma.message.aggregate({
      where: {
        conversation: {
          chatbotId: { in: chatbotIds },
          createdAt: { gte: periodStart },
        },
        role: 'ASSISTANT',
        latencyMs: { not: null },
      },
      _avg: { latencyMs: true },
      _count: { id: true },
    });

    const totalMessages = await prisma.message.count({
      where: {
        conversation: {
          chatbotId: { in: chatbotIds },
          createdAt: { gte: periodStart },
        },
      },
    });

    const resolutionRate = totalConversations > 0 ? resolvedCount / totalConversations : 0;
    const escalationRate = totalConversations > 0 ? escalatedCount / totalConversations : 0;

    const topIntents = await this.getTopQuestions(tenantId, chatbotId, 5);

    this.logger.debug(
      `Dashboard metrics for tenant ${tenantId}: ${totalConversations} conversations, ${totalMessages} messages`,
    );

    return {
      totalConversations,
      totalMessages,
      avgResponseTimeMs: Math.round(messageAgg._avg.latencyMs ?? 0),
      resolutionRate: Math.round(resolutionRate * 10000) / 10000,
      escalationRate: Math.round(escalationRate * 10000) / 10000,
      topIntents,
    };
  }

  async getUsageChart(
    tenantId: string,
    chatbotId?: string,
    groupBy: GroupBy = 'day',
  ): Promise<UsageChartPoint[]> {
    const daysBack = groupBy === 'hour' ? 7 : 30;
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - daysBack);
    periodStart.setHours(0, 0, 0, 0);

    const hourlyRecords = await prisma.usageHourly.findMany({
      where: {
        tenantId,
        ...(chatbotId ? { chatbotId } : {}),
        hour: { gte: periodStart },
      },
      orderBy: { hour: 'asc' },
    });

    const grouped = new Map<string, { tokens: bigint; cost: number; messages: number }>();

    for (const record of hourlyRecords) {
      let key: string;
      const d = record.hour;
      if (groupBy === 'hour') {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:00`;
      } else {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      }

      const existing = grouped.get(key);
      if (existing) {
        existing.tokens += record.totalTokens;
        existing.cost += Number(record.billedCostUsd);
        existing.messages += record.messageCount;
      } else {
        grouped.set(key, {
          tokens: record.totalTokens,
          cost: Number(record.billedCostUsd),
          messages: record.messageCount,
        });
      }
    }

    return Array.from(grouped.entries()).map(([period, data]) => ({
      period,
      tokens: Number(data.tokens),
      cost: Math.round(data.cost * 10000) / 10000,
      messages: data.messages,
    }));
  }

  async getConversationList(
    tenantId: string,
    chatbotId?: string,
    filters: ConversationFilters = {},
    pagination: { page?: number; limit?: number } = {},
  ): Promise<PaginatedResponse<ConversationListItem>> {
    const page = pagination.page ?? 1;
    const limit = Math.min(pagination.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const chatbots = await prisma.chatbot.findMany({
      where: { tenantId, ...(chatbotId ? { id: chatbotId } : {}) },
      select: { id: true },
    });
    const chatbotIds = chatbots.map((c) => c.id);

    const where: Prisma.ConversationWhereInput = {
      chatbotId: { in: chatbotIds },
      ...(filters.status ? { status: filters.status } : {}),
    };

    const [total, conversations] = await Promise.all([
      prisma.conversation.count({ where }),
      prisma.conversation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { lastMessageAt: 'desc' },
        include: {
          _count: { select: { messages: true } },
        },
      }),
    ]);

    const data: ConversationListItem[] = conversations.map((c) => ({
      id: c.id,
      chatbotId: c.chatbotId,
      channel: c.channel,
      endUserId: c.endUserId ?? null,
      endUserName: c.endUserName ?? null,
      status: c.status,
      sentiment: c.sentiment !== null ? Number(c.sentiment) : null,
      startedAt: c.startedAt,
      lastMessageAt: c.lastMessageAt,
      messageCount: c._count.messages,
    }));

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getConversationDetail(
    tenantId: string,
    conversationId: string,
  ): Promise<object> {
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        chatbot: { tenantId },
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          include: { toolInvocations: true },
        },
        chatbot: { select: { id: true, name: true, tenantId: true } },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }

  async getSentimentTrend(
    tenantId: string,
    chatbotId?: string,
    period: Period = '30d',
  ): Promise<SentimentPoint[]> {
    const periodStart = this.getPeriodStart(period);

    const chatbots = await prisma.chatbot.findMany({
      where: { tenantId, ...(chatbotId ? { id: chatbotId } : {}) },
      select: { id: true },
    });
    const chatbotIds = chatbots.map((c) => c.id);

    const conversations = await prisma.conversation.findMany({
      where: {
        chatbotId: { in: chatbotIds },
        createdAt: { gte: periodStart },
        sentiment: { not: null },
      },
      select: { sentiment: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const byDate = new Map<string, { sum: number; count: number }>();

    for (const conv of conversations) {
      if (conv.sentiment === null) continue;
      const dateKey = conv.createdAt.toISOString().slice(0, 10);
      const existing = byDate.get(dateKey);
      if (existing) {
        existing.sum += Number(conv.sentiment);
        existing.count += 1;
      } else {
        byDate.set(dateKey, { sum: Number(conv.sentiment), count: 1 });
      }
    }

    return Array.from(byDate.entries()).map(([date, { sum, count }]) => ({
      date,
      avgSentiment: Math.round((sum / count) * 1000) / 1000,
    }));
  }

  async getTopQuestions(
    tenantId: string,
    chatbotId?: string,
    limit = 10,
  ): Promise<Array<{ intent: string; count: number }>> {
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - 30);

    const chatbots = await prisma.chatbot.findMany({
      where: { tenantId, ...(chatbotId ? { id: chatbotId } : {}) },
      select: { id: true },
    });
    const chatbotIds = chatbots.map((c) => c.id);

    const messages = await prisma.message.findMany({
      where: {
        role: 'USER',
        createdAt: { gte: periodStart },
        conversation: { chatbotId: { in: chatbotIds } },
      },
      select: { content: true },
      take: 2000,
    });

    const wordFrequency = new Map<string, number>();
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has',
      'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
      'i', 'you', 'me', 'my', 'your', 'we', 'our', 'it', 'its', 'this', 'that',
      'can', 'what', 'how', 'when', 'where', 'who', 'why', 'which',
    ]);

    for (const message of messages) {
      const words = message.content
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 3 && !stopWords.has(w));

      for (const word of words) {
        wordFrequency.set(word, (wordFrequency.get(word) ?? 0) + 1);
      }
    }

    return Array.from(wordFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([intent, count]) => ({ intent, count }));
  }

  async updateConversationStatus(
    tenantId: string,
    conversationId: string,
    status: 'OPEN' | 'CLOSED' | 'ESCALATED',
  ): Promise<object> {
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, chatbot: { tenantId } },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');

    return prisma.conversation.update({
      where: { id: conversationId },
      data: { status: status as ConversationStatus },
    });
  }

  async getRevenueAttribution(
    tenantId: string,
    chatbotId?: string,
  ): Promise<RevenueConversation[]> {
    const chatbots = await prisma.chatbot.findMany({
      where: { tenantId, ...(chatbotId ? { id: chatbotId } : {}) },
      select: { id: true },
    });
    const chatbotIds = chatbots.map((c) => c.id);

    const conversations = await prisma.conversation.findMany({
      where: {
        chatbotId: { in: chatbotIds },
        metadata: {
          path: ['converted'],
          equals: true,
        },
      },
      select: {
        id: true,
        chatbotId: true,
        endUserId: true,
        startedAt: true,
        metadata: true,
      },
      orderBy: { startedAt: 'desc' },
    });

    this.logger.debug(
      `Revenue attribution for tenant ${tenantId}: ${conversations.length} converted conversations`,
    );

    return conversations;
  }
}
