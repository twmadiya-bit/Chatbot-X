import { Injectable, Logger } from '@nestjs/common';
import { prisma } from '@chatbot-x/database';
import type { CreateChatbotDto, UpdateBrandingDto } from '@chatbot-x/shared';
import { NotFoundError, ForbiddenError } from '@chatbot-x/shared';
import { customAlphabet } from 'nanoid';
import { WIDGET_API_KEY_PREFIX } from '@chatbot-x/shared';

interface PlanFeatureWithKey {
  feature: { key: string };
}

const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', 32);

@Injectable()
export class ChatbotsService {
  private readonly logger = new Logger(ChatbotsService.name);

  async create(tenantId: string, dto: CreateChatbotDto) {
    const apiKey = `${WIDGET_API_KEY_PREFIX}${nanoid()}`;

    const chatbot = await prisma.chatbot.create({
      data: {
        tenantId,
        name: dto.name,
        description: dto.description,
        industryId: dto.industryId ?? null,
        industryPlanId: dto.industryPlanId ?? null,
        botTemplateId: dto.botTemplateId ?? null,
        channel: dto.channel,
        systemPrompt: dto.systemPrompt,
        aiModelId: dto.aiModelId ?? null,
        maxTokens: dto.maxTokens,
        temperature: dto.temperature,
        config: dto.config as object,
        branding: {
          create: {
            primaryColor: '#6366F1',
            secondaryColor: '#FFFFFF',
            backgroundColor: '#F9FAFB',
            textColor: '#111827',
            userBubbleColor: '#6366F1',
            botBubbleColor: '#F3F4F6',
            fontFamily: 'Inter',
            borderRadius: 16,
            position: 'BOTTOM_RIGHT',
            launcherText: 'Chat with us',
            welcomeScreenEnabled: true,
            welcomeMessage: 'Hello! How can I help you today?',
            placeholderText: 'Type a message...',
            widgetWidth: 380,
            widgetHeight: 600,
          },
        },
        widgetDeployment: {
          create: {
            apiKey,
            allowedDomains: [],
            isActive: true,
          },
        },
        handoffConfig: {
          create: {
            isEnabled: false,
            triggerKeywords: [],
            maxUnansweredTurns: 3,
            sentimentThreshold: 0.3,
            confidenceThreshold: 0.4,
          },
        },
      },
      include: {
        industry: true,
        branding: true,
        widgetDeployment: true,
        handoffConfig: true,
        subscription: true,
      },
    });

    this.logger.log(`Chatbot created: ${chatbot.id} for tenant ${tenantId}`);
    return chatbot;
  }

  async findAll(tenantId: string) {
    return prisma.chatbot.findMany({
      where: { tenantId },
      include: {
        industry: true,
        branding: true,
        subscription: {
          include: {
            industryPlan: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(tenantId: string, id: string) {
    const chatbot = await prisma.chatbot.findUnique({
      where: { id },
      include: {
        industry: true,
        branding: true,
        widgetDeployment: true,
        handoffConfig: true,
        subscription: {
          include: {
            industryPlan: true,
          },
        },
        aiModel: true,
      },
    });

    if (!chatbot) {
      throw new NotFoundError('Chatbot');
    }

    if (chatbot.tenantId !== tenantId) {
      throw new NotFoundError('Chatbot');
    }

    return chatbot;
  }

  async update(tenantId: string, id: string, dto: Partial<CreateChatbotDto>) {
    await this.findById(tenantId, id);

    return prisma.chatbot.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.industryId !== undefined && { industryId: dto.industryId }),
        ...(dto.industryPlanId !== undefined && { industryPlanId: dto.industryPlanId }),
        ...(dto.botTemplateId !== undefined && { botTemplateId: dto.botTemplateId }),
        ...(dto.channel !== undefined && { channel: dto.channel }),
        ...(dto.systemPrompt !== undefined && { systemPrompt: dto.systemPrompt }),
        ...(dto.aiModelId !== undefined && { aiModelId: dto.aiModelId }),
        ...(dto.maxTokens !== undefined && { maxTokens: dto.maxTokens }),
        ...(dto.temperature !== undefined && { temperature: dto.temperature }),
        ...(dto.config !== undefined && { config: dto.config as object }),
      },
      include: {
        industry: true,
        branding: true,
        widgetDeployment: true,
        handoffConfig: true,
        subscription: true,
      },
    });
  }

  async updateBranding(tenantId: string, chatbotId: string, dto: UpdateBrandingDto) {
    await this.findById(tenantId, chatbotId);

    return prisma.botBranding.upsert({
      where: { chatbotId },
      create: {
        chatbotId,
        ...(dto.primaryColor !== undefined && { primaryColor: dto.primaryColor }),
        ...(dto.secondaryColor !== undefined && { secondaryColor: dto.secondaryColor }),
        ...(dto.backgroundColor !== undefined && { backgroundColor: dto.backgroundColor }),
        ...(dto.textColor !== undefined && { textColor: dto.textColor }),
        ...(dto.userBubbleColor !== undefined && { userBubbleColor: dto.userBubbleColor }),
        ...(dto.botBubbleColor !== undefined && { botBubbleColor: dto.botBubbleColor }),
        ...(dto.fontFamily !== undefined && { fontFamily: dto.fontFamily }),
        ...(dto.borderRadius !== undefined && { borderRadius: dto.borderRadius }),
        ...(dto.position !== undefined && { position: dto.position }),
        ...(dto.launcherText !== undefined && { launcherText: dto.launcherText }),
        ...(dto.headerTitle !== undefined && { headerTitle: dto.headerTitle }),
        ...(dto.headerSubtitle !== undefined && { headerSubtitle: dto.headerSubtitle }),
        ...(dto.welcomeMessage !== undefined && { welcomeMessage: dto.welcomeMessage }),
        ...(dto.placeholderText !== undefined && { placeholderText: dto.placeholderText }),
        ...(dto.widgetWidth !== undefined && { widgetWidth: dto.widgetWidth }),
        ...(dto.widgetHeight !== undefined && { widgetHeight: dto.widgetHeight }),
      },
      update: {
        ...(dto.primaryColor !== undefined && { primaryColor: dto.primaryColor }),
        ...(dto.secondaryColor !== undefined && { secondaryColor: dto.secondaryColor }),
        ...(dto.backgroundColor !== undefined && { backgroundColor: dto.backgroundColor }),
        ...(dto.textColor !== undefined && { textColor: dto.textColor }),
        ...(dto.userBubbleColor !== undefined && { userBubbleColor: dto.userBubbleColor }),
        ...(dto.botBubbleColor !== undefined && { botBubbleColor: dto.botBubbleColor }),
        ...(dto.fontFamily !== undefined && { fontFamily: dto.fontFamily }),
        ...(dto.borderRadius !== undefined && { borderRadius: dto.borderRadius }),
        ...(dto.position !== undefined && { position: dto.position }),
        ...(dto.launcherText !== undefined && { launcherText: dto.launcherText }),
        ...(dto.headerTitle !== undefined && { headerTitle: dto.headerTitle }),
        ...(dto.headerSubtitle !== undefined && { headerSubtitle: dto.headerSubtitle }),
        ...(dto.welcomeMessage !== undefined && { welcomeMessage: dto.welcomeMessage }),
        ...(dto.placeholderText !== undefined && { placeholderText: dto.placeholderText }),
        ...(dto.widgetWidth !== undefined && { widgetWidth: dto.widgetWidth }),
        ...(dto.widgetHeight !== undefined && { widgetHeight: dto.widgetHeight }),
      },
    });
  }

  async activate(tenantId: string, id: string) {
    const chatbot = await this.findById(tenantId, id);

    const setupFee = await prisma.setupFeePayment.findUnique({
      where: { chatbotId: id },
    });

    if (!setupFee || setupFee.status !== 'PAID') {
      throw new ForbiddenError('Setup fee must be paid before activating the chatbot');
    }

    const subscription = chatbot.subscription;
    if (!subscription || subscription.status !== 'ACTIVE') {
      throw new ForbiddenError('An active subscription is required to activate the chatbot');
    }

    return prisma.chatbot.update({
      where: { id },
      data: { status: 'ACTIVE' },
    });
  }

  async pause(tenantId: string, id: string) {
    await this.findById(tenantId, id);

    return prisma.chatbot.update({
      where: { id },
      data: { status: 'PAUSED' },
    });
  }

  async archive(tenantId: string, id: string) {
    await this.findById(tenantId, id);

    return prisma.chatbot.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });
  }

  async getEntitlements(chatbotId: string): Promise<Set<string>> {
    const chatbot = await prisma.chatbot.findUnique({
      where: { id: chatbotId },
      select: { industryPlanId: true },
    });

    if (!chatbot?.industryPlanId) {
      return new Set<string>();
    }

    const planFeatures = await prisma.planFeature.findMany({
      where: {
        industryPlanId: chatbot.industryPlanId,
        isEnabled: true,
      },
      include: {
        feature: {
          select: { key: true },
        },
      },
    });

    return new Set((planFeatures as PlanFeatureWithKey[]).map((pf) => pf.feature.key));
  }

  async regenerateApiKey(tenantId: string, chatbotId: string) {
    await this.findById(tenantId, chatbotId);

    const newApiKey = `${WIDGET_API_KEY_PREFIX}${nanoid()}`;

    return prisma.widgetDeployment.update({
      where: { chatbotId },
      data: { apiKey: newApiKey },
    });
  }

  async updateHandoffConfig(
    tenantId: string,
    chatbotId: string,
    dto: {
      isEnabled: boolean;
      sentimentThreshold?: number;
      confidenceThreshold?: number;
      maxUnansweredTurns?: number;
      triggerKeywords?: string[];
      escalationMessage?: string;
    },
  ) {
    await this.findById(tenantId, chatbotId);
    return prisma.handoffConfig.upsert({
      where: { chatbotId },
      create: {
        chatbotId,
        isEnabled: dto.isEnabled,
        sentimentThreshold: dto.sentimentThreshold ?? 0.3,
        confidenceThreshold: dto.confidenceThreshold ?? 0.4,
        maxUnansweredTurns: dto.maxUnansweredTurns ?? 3,
        triggerKeywords: dto.triggerKeywords ?? [],
        escalationMessage: dto.escalationMessage ?? null,
      },
      update: {
        isEnabled: dto.isEnabled,
        ...(dto.sentimentThreshold !== undefined && { sentimentThreshold: dto.sentimentThreshold }),
        ...(dto.confidenceThreshold !== undefined && { confidenceThreshold: dto.confidenceThreshold }),
        ...(dto.maxUnansweredTurns !== undefined && { maxUnansweredTurns: dto.maxUnansweredTurns }),
        ...(dto.triggerKeywords !== undefined && { triggerKeywords: dto.triggerKeywords }),
        ...(dto.escalationMessage !== undefined && { escalationMessage: dto.escalationMessage }),
      },
    });
  }

  async listAiModels() {
    return prisma.aiModel.findMany({
      where: { isActive: true },
      include: { provider: { select: { name: true, providerKey: true } } },
      orderBy: [{ provider: { name: 'asc' } }, { name: 'asc' }],
    });
  }

  async saveWhatsappConfig(
    tenantId: string,
    chatbotId: string,
    dto: { phoneNumberId: string; wabaId: string; accessToken: string; verifyToken?: string },
  ) {
    await this.findById(tenantId, chatbotId);

    const encrypted = Buffer.from(dto.accessToken).toString('base64');

    return prisma.whatsappConfig.upsert({
      where: { chatbotId },
      create: {
        chatbotId,
        phoneNumberId: dto.phoneNumberId,
        wabaId: dto.wabaId,
        accessTokenEncrypted: encrypted,
        verifyToken: dto.verifyToken ?? null,
        isActive: true,
      },
      update: {
        phoneNumberId: dto.phoneNumberId,
        wabaId: dto.wabaId,
        accessTokenEncrypted: encrypted,
        ...(dto.verifyToken !== undefined && { verifyToken: dto.verifyToken }),
        isActive: true,
      },
    });
  }
}
