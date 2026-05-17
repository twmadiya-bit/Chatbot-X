import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { prisma } from '@chatbot-x/database';
import type { OutboundCampaign } from '@chatbot-x/database';
import type { CreateCampaignDto } from '@chatbot-x/shared';
import type { Prisma } from '@chatbot-x/database';

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(
    @InjectQueue('outbound-campaign') private readonly campaignQueue: Queue,
  ) {}

  async create(
    tenantId: string,
    chatbotId: string,
    dto: CreateCampaignDto,
  ): Promise<OutboundCampaign> {
    const chatbot = await prisma.chatbot.findFirst({ where: { id: chatbotId, tenantId } });
    if (!chatbot) {
      throw new NotFoundException(`Chatbot ${chatbotId} not found`);
    }

    const campaign = await prisma.outboundCampaign.create({
      data: {
        chatbotId,
        name: dto.name,
        triggerType: dto.triggerType,
        triggerConfig: dto.triggerConfig as Prisma.InputJsonValue,
        messageTemplate: dto.messageTemplate,
        channel: dto.channel,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        status: 'DRAFT',
      },
    });

    this.logger.log(`Created campaign ${campaign.id} for chatbot ${chatbotId}`);
    return campaign;
  }

  async list(tenantId: string, chatbotId?: string): Promise<OutboundCampaign[]> {
    const chatbotIds = chatbotId
      ? [chatbotId]
      : (
          await prisma.chatbot.findMany({
            where: { tenantId },
            select: { id: true },
          })
        ).map((c) => c.id);

    return prisma.outboundCampaign.findMany({
      where: { chatbotId: { in: chatbotIds } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async activate(tenantId: string, campaignId: string): Promise<OutboundCampaign> {
    const campaign = await this.requireCampaign(tenantId, campaignId);

    const updated = await prisma.outboundCampaign.update({
      where: { id: campaignId },
      data: { status: 'ACTIVE' },
    });

    this.logger.log(`Activated campaign ${campaignId}`);

    if (campaign.triggerType === 'SCHEDULED') {
      await this.sendCampaign(campaignId);
    }

    return updated;
  }

  async pause(tenantId: string, campaignId: string): Promise<OutboundCampaign> {
    await this.requireCampaign(tenantId, campaignId);

    const updated = await prisma.outboundCampaign.update({
      where: { id: campaignId },
      data: { status: 'PAUSED' },
    });

    this.logger.log(`Paused campaign ${campaignId}`);
    return updated;
  }

  async sendCampaign(campaignId: string): Promise<void> {
    const campaign = await prisma.outboundCampaign.findUnique({ where: { id: campaignId } });
    if (!campaign) {
      throw new NotFoundException(`Campaign ${campaignId} not found`);
    }

    const profiles = await prisma.endUserProfile.findMany({
      where: {
        chatbotId: campaign.chatbotId,
        phone: { not: null },
      },
      select: { endUserId: true, phone: true },
    });

    if (profiles.length === 0) {
      this.logger.log(`No eligible users found for campaign ${campaignId}`);
      return;
    }

    for (const profile of profiles) {
      await this.campaignQueue.add(
        'send-campaign-message',
        { campaignId, endUserId: profile.endUserId, phone: profile.phone },
        { attempts: 2, backoff: { type: 'fixed', delay: 5000 } },
      );
    }

    this.logger.log(`Queued ${profiles.length} campaign messages for campaign ${campaignId}`);
  }

  async handleWebhookTrigger(
    chatbotId: string,
    triggerType: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const campaigns = await prisma.outboundCampaign.findMany({
      where: {
        chatbotId,
        status: 'ACTIVE',
        triggerType: triggerType as OutboundCampaign['triggerType'],
      },
    });

    if (campaigns.length === 0) {
      this.logger.debug(`No active campaigns for trigger ${triggerType} on chatbot ${chatbotId}`);
      return;
    }

    const phone = payload['phone'] as string | undefined;
    const endUserId = payload['endUserId'] as string | undefined;

    for (const campaign of campaigns) {
      await this.campaignQueue.add(
        'send-campaign-message',
        { campaignId: campaign.id, endUserId: endUserId ?? '', phone: phone ?? null },
        { attempts: 2, backoff: { type: 'fixed', delay: 3000 } },
      );
    }

    this.logger.log(
      `Queued webhook-triggered messages for ${campaigns.length} campaigns on chatbot ${chatbotId}`,
    );
  }

  private async requireCampaign(tenantId: string, campaignId: string): Promise<OutboundCampaign> {
    const chatbots = await prisma.chatbot.findMany({
      where: { tenantId },
      select: { id: true },
    });
    const chatbotIds = chatbots.map((c) => c.id);

    const campaign = await prisma.outboundCampaign.findFirst({
      where: { id: campaignId, chatbotId: { in: chatbotIds } },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign ${campaignId} not found`);
    }

    return campaign;
  }
}
