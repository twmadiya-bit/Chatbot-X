import { Injectable, Logger } from '@nestjs/common';
import { prisma } from '@chatbot-x/database';
import type { WidgetConfig, BrandingConfig, StreamChunk } from '@chatbot-x/shared';
import { UnauthorizedError } from '@chatbot-x/shared';
import { ChatService } from '../chat/chat.service';

export interface ProcessMessageParams {
  apiKey: string;
  visitorId: string;
  conversationId?: string;
  message: string;
  mediaUrl?: string;
  mediaType?: string;
}

@Injectable()
export class WidgetService {
  private readonly logger = new Logger(WidgetService.name);

  constructor(private readonly chat: ChatService) {}

  async validateApiKey(apiKey: string) {
    const deployment = await prisma.widgetDeployment.findUnique({
      where: { apiKey },
      include: { chatbot: { include: { branding: true, aiModel: true } } },
    });
    if (!deployment || !deployment.isActive) throw new UnauthorizedError('Invalid or inactive widget API key');
    if (deployment.chatbot.status !== 'ACTIVE') throw new UnauthorizedError('Chatbot is not active');
    return deployment;
  }

  async getConfig(apiKey: string, domain: string): Promise<WidgetConfig> {
    const deployment = await this.validateApiKey(apiKey);
    if (
      deployment.allowedDomains.length > 0 &&
      !deployment.allowedDomains.some((allowed: string) => {
        if (allowed.startsWith('*.')) {
          const suffix = allowed.slice(2);
          return domain === suffix || domain.endsWith(`.${suffix}`);
        }
        return allowed === domain;
      })
    ) throw new UnauthorizedError('Domain not allowed for this widget');

    const { chatbot } = deployment;
    const b = chatbot.branding;
    const branding: BrandingConfig = b ? {
      primaryColor: b.primaryColor, secondaryColor: b.secondaryColor,
      backgroundColor: b.backgroundColor, textColor: b.textColor,
      userBubbleColor: b.userBubbleColor, botBubbleColor: b.botBubbleColor,
      fontFamily: b.fontFamily, borderRadius: b.borderRadius,
      logoUrl: b.logoUrl ?? undefined, avatarUrl: b.avatarUrl ?? undefined,
      position: b.position.toLowerCase().replace('_', '-') as BrandingConfig['position'],
      launcherText: b.launcherText, headerTitle: b.headerTitle ?? undefined,
      headerSubtitle: b.headerSubtitle ?? undefined,
      welcomeScreenEnabled: b.welcomeScreenEnabled, welcomeMessage: b.welcomeMessage,
      placeholderText: b.placeholderText, widgetWidth: b.widgetWidth, widgetHeight: b.widgetHeight,
    } : this.defaultBranding();

    return { chatbotId: chatbot.id, branding, welcomeMessage: b?.welcomeMessage ?? 'Hello! How can I help you today?', imageUploadEnabled: false, voiceInputEnabled: false };
  }

  async getOrCreateConversation(chatbotId: string, visitorId: string) {
    const existing = await prisma.conversation.findFirst({
      where: { chatbotId, endUserId: visitorId, status: 'OPEN', channel: 'WIDGET' },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) return existing;
    return prisma.conversation.create({ data: { chatbotId, channel: 'WIDGET', endUserId: visitorId, status: 'OPEN' } });
  }

  async processMessage(params: ProcessMessageParams) {
    const deployment = await this.validateApiKey(params.apiKey);
    const { chatbot } = deployment;

    const conversation = params.conversationId
      ? (await prisma.conversation.findUnique({ where: { id: params.conversationId } })) ?? await this.getOrCreateConversation(chatbot.id, params.visitorId)
      : await this.getOrCreateConversation(chatbot.id, params.visitorId);

    const result = await this.chat.processMessage({
      tenantId: chatbot.tenantId,
      chatbotId: chatbot.id,
      conversationId: conversation.id,
      endUserId: params.visitorId,
      userMessage: params.message,
      channel: 'WIDGET',
      mediaUrl: params.mediaUrl,
      mediaType: params.mediaType,
    });

    await prisma.$transaction([
      prisma.message.create({ data: { conversationId: conversation.id, role: 'USER', content: params.message, mediaUrl: params.mediaUrl ?? null, mediaType: params.mediaType ?? null, inputTokens: result.inputTokens } }),
      prisma.message.create({ data: { conversationId: conversation.id, role: 'ASSISTANT', content: result.response, outputTokens: result.outputTokens, latencyMs: result.latencyMs, aiModelId: chatbot.aiModelId ?? null, sentimentScore: result.sentimentScore, isEscalated: result.shouldEscalate } }),
      prisma.conversation.update({ where: { id: conversation.id }, data: { lastMessageAt: new Date(), sentiment: result.sentimentScore, status: result.shouldEscalate ? 'ESCALATED' : 'OPEN' } }),
    ]);

    return { conversationId: conversation.id, message: result.response, inputTokens: result.inputTokens, outputTokens: result.outputTokens };
  }

  async *streamMessage(params: ProcessMessageParams): AsyncIterable<StreamChunk> {
    const deployment = await this.validateApiKey(params.apiKey);
    const { chatbot } = deployment;

    const conversation = params.conversationId
      ? (await prisma.conversation.findUnique({ where: { id: params.conversationId } })) ?? await this.getOrCreateConversation(chatbot.id, params.visitorId)
      : await this.getOrCreateConversation(chatbot.id, params.visitorId);

    let fullContent = '';
    let inputTokens = 0;
    let outputTokens = 0;

    for await (const chunk of this.chat.streamMessage({
      tenantId: chatbot.tenantId, chatbotId: chatbot.id, conversationId: conversation.id,
      endUserId: params.visitorId, userMessage: params.message, channel: 'WIDGET',
      mediaUrl: params.mediaUrl, mediaType: params.mediaType,
    })) {
      if (chunk.type === 'text_delta' && chunk.content) fullContent += chunk.content;
      if (chunk.type === 'message_done' && chunk.usage) { inputTokens = chunk.usage.inputTokens; outputTokens = chunk.usage.outputTokens; }
      yield chunk;
    }

    if (fullContent) {
      await prisma.$transaction([
        prisma.message.create({ data: { conversationId: conversation.id, role: 'USER', content: params.message, inputTokens } }),
        prisma.message.create({ data: { conversationId: conversation.id, role: 'ASSISTANT', content: fullContent, outputTokens, aiModelId: chatbot.aiModelId ?? null } }),
        prisma.conversation.update({ where: { id: conversation.id }, data: { lastMessageAt: new Date() } }),
      ]);
    }
  }

  private defaultBranding(): BrandingConfig {
    return { primaryColor: '#6366F1', secondaryColor: '#FFFFFF', backgroundColor: '#F9FAFB', textColor: '#111827', userBubbleColor: '#6366F1', botBubbleColor: '#F3F4F6', fontFamily: 'Inter', borderRadius: 16, position: 'bottom-right', launcherText: 'Chat with us', welcomeScreenEnabled: true, welcomeMessage: 'Hello! How can I help you today?', placeholderText: 'Type a message...', widgetWidth: 380, widgetHeight: 600 };
  }
}
