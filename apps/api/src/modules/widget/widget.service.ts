import { Injectable, Logger } from '@nestjs/common';
import { prisma } from '@chatbot-x/database';
import type { WidgetConfig, BrandingConfig, ChatMessage, StreamChunk } from '@chatbot-x/shared';
import { UnauthorizedError } from '@chatbot-x/shared';
import { AiGatewayService } from '../ai-gateway/ai-gateway.service';
import { SafetyLayerService } from '../ai-gateway/safety/safety-layer.service';
import type { AiGatewayRequest } from '../ai-gateway/interfaces/ai-provider.interface';

interface RawMessage {
  role: string;
  content: string;
}

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

  constructor(
    private readonly aiGateway: AiGatewayService,
    private readonly safety: SafetyLayerService,
  ) {}

  async validateApiKey(apiKey: string) {
    const deployment = await prisma.widgetDeployment.findUnique({
      where: { apiKey },
      include: {
        chatbot: {
          include: {
            branding: true,
            aiModel: true,
          },
        },
      },
    });

    if (!deployment || !deployment.isActive) {
      throw new UnauthorizedError('Invalid or inactive widget API key');
    }

    if (deployment.chatbot.status !== 'ACTIVE') {
      throw new UnauthorizedError('Chatbot is not active');
    }

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
    ) {
      throw new UnauthorizedError('Domain not allowed for this widget');
    }

    const { chatbot } = deployment;
    const b = chatbot.branding;

    const branding: BrandingConfig = b
      ? {
          primaryColor: b.primaryColor,
          secondaryColor: b.secondaryColor,
          backgroundColor: b.backgroundColor,
          textColor: b.textColor,
          userBubbleColor: b.userBubbleColor,
          botBubbleColor: b.botBubbleColor,
          fontFamily: b.fontFamily,
          borderRadius: b.borderRadius,
          logoUrl: b.logoUrl ?? undefined,
          avatarUrl: b.avatarUrl ?? undefined,
          position: b.position.toLowerCase().replace('_', '-') as BrandingConfig['position'],
          launcherText: b.launcherText,
          headerTitle: b.headerTitle ?? undefined,
          headerSubtitle: b.headerSubtitle ?? undefined,
          welcomeScreenEnabled: b.welcomeScreenEnabled,
          welcomeMessage: b.welcomeMessage,
          placeholderText: b.placeholderText,
          widgetWidth: b.widgetWidth,
          widgetHeight: b.widgetHeight,
        }
      : this.defaultBranding();

    return {
      chatbotId: chatbot.id,
      branding,
      welcomeMessage: b?.welcomeMessage ?? 'Hello! How can I help you today?',
      imageUploadEnabled: false,
      voiceInputEnabled: false,
    };
  }

  async createConversation(chatbotId: string, visitorId: string, channel: 'WIDGET' = 'WIDGET') {
    return prisma.conversation.create({
      data: {
        chatbotId,
        channel,
        endUserId: visitorId,
        status: 'OPEN',
      },
    });
  }

  async getOrCreateConversation(chatbotId: string, visitorId: string) {
    const existing = await prisma.conversation.findFirst({
      where: {
        chatbotId,
        endUserId: visitorId,
        status: 'OPEN',
        channel: 'WIDGET',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existing) {
      return existing;
    }

    return this.createConversation(chatbotId, visitorId);
  }

  async processMessage(params: ProcessMessageParams) {
    const { apiKey, visitorId, message, mediaUrl, mediaType } = params;

    const deployment = await this.validateApiKey(apiKey);
    const { chatbot } = deployment;

    const conversation = params.conversationId
      ? await prisma.conversation.findUnique({ where: { id: params.conversationId } }) ??
        await this.getOrCreateConversation(chatbot.id, visitorId)
      : await this.getOrCreateConversation(chatbot.id, visitorId);

    const safetyResult = this.safety.checkInput(message);
    if (!safetyResult.passed) {
      const blockedResponse = "I'm sorry, I can't process that request.";
      return {
        conversationId: conversation.id,
        message: blockedResponse,
        inputTokens: 0,
        outputTokens: 0,
      };
    }

    const sanitizedMessage = safetyResult.sanitizedInput ?? message;

    const recentMessages = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });

    const contextMessages: ChatMessage[] = (recentMessages as RawMessage[]).map((m) => ({
      role: m.role.toLowerCase() as 'user' | 'assistant',
      content: m.content,
    }));

    contextMessages.push({ role: 'user', content: sanitizedMessage });

    const modelId = chatbot.aiModel?.modelId ?? 'claude-sonnet-4-6';

    const request: AiGatewayRequest = {
      tenantId: chatbot.tenantId,
      chatbotId: chatbot.id,
      conversationId: conversation.id,
      messages: contextMessages,
      systemPrompt: chatbot.systemPrompt,
      model: modelId,
      maxTokens: chatbot.maxTokens,
      temperature: Number(chatbot.temperature),
    };

    const startedAt = Date.now();
    const aiResponse = await this.aiGateway.chat(request);
    const latencyMs = Date.now() - startedAt;

    await prisma.$transaction([
      prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: 'USER',
          content: sanitizedMessage,
          mediaUrl: mediaUrl ?? null,
          mediaType: mediaType ?? null,
          inputTokens: aiResponse.inputTokens,
        },
      }),
      prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: 'ASSISTANT',
          content: aiResponse.content,
          outputTokens: aiResponse.outputTokens,
          latencyMs,
          aiModelId: chatbot.aiModelId ?? null,
        },
      }),
      prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: new Date() },
      }),
    ]);

    this.logger.debug(
      `Widget message processed: conversation=${conversation.id} tokens=${aiResponse.inputTokens}+${aiResponse.outputTokens}`,
    );

    return {
      conversationId: conversation.id,
      message: aiResponse.content,
      inputTokens: aiResponse.inputTokens,
      outputTokens: aiResponse.outputTokens,
    };
  }

  async *streamMessage(params: ProcessMessageParams): AsyncIterable<StreamChunk> {
    const { apiKey, visitorId, message, mediaUrl, mediaType } = params;

    const deployment = await this.validateApiKey(apiKey);
    const { chatbot } = deployment;

    const conversation = params.conversationId
      ? await prisma.conversation.findUnique({ where: { id: params.conversationId } }) ??
        await this.getOrCreateConversation(chatbot.id, visitorId)
      : await this.getOrCreateConversation(chatbot.id, visitorId);

    const safetyResult = this.safety.checkInput(message);
    if (!safetyResult.passed) {
      yield { type: 'text_delta', content: "I'm sorry, I can't process that request." };
      yield { type: 'message_done', usage: { inputTokens: 0, outputTokens: 0 } };
      return;
    }

    const sanitizedMessage = safetyResult.sanitizedInput ?? message;

    const recentMessages = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });

    const contextMessages: ChatMessage[] = (recentMessages as RawMessage[]).map((m) => ({
      role: m.role.toLowerCase() as 'user' | 'assistant',
      content: m.content,
    }));

    contextMessages.push({ role: 'user', content: sanitizedMessage });

    const modelId = chatbot.aiModel?.modelId ?? 'claude-sonnet-4-6';

    const request: AiGatewayRequest = {
      tenantId: chatbot.tenantId,
      chatbotId: chatbot.id,
      conversationId: conversation.id,
      messages: contextMessages,
      systemPrompt: chatbot.systemPrompt,
      model: modelId,
      maxTokens: chatbot.maxTokens,
      temperature: Number(chatbot.temperature),
    };

    let fullContent = '';
    let inputTokens = 0;
    let outputTokens = 0;

    for await (const chunk of this.aiGateway.stream(request)) {
      if (chunk.type === 'text_delta' && chunk.content) {
        fullContent += chunk.content;
      }
      if (chunk.type === 'message_done' && chunk.usage) {
        inputTokens = chunk.usage.inputTokens;
        outputTokens = chunk.usage.outputTokens;
      }
      yield chunk;
    }

    if (fullContent) {
      await prisma.$transaction([
        prisma.message.create({
          data: {
            conversationId: conversation.id,
            role: 'USER',
            content: sanitizedMessage,
            mediaUrl: mediaUrl ?? null,
            mediaType: mediaType ?? null,
            inputTokens,
          },
        }),
        prisma.message.create({
          data: {
            conversationId: conversation.id,
            role: 'ASSISTANT',
            content: fullContent,
            outputTokens,
            aiModelId: chatbot.aiModelId ?? null,
          },
        }),
        prisma.conversation.update({
          where: { id: conversation.id },
          data: { lastMessageAt: new Date() },
        }),
      ]);
    }
  }

  private defaultBranding(): BrandingConfig {
    return {
      primaryColor: '#6366F1',
      secondaryColor: '#FFFFFF',
      backgroundColor: '#F9FAFB',
      textColor: '#111827',
      userBubbleColor: '#6366F1',
      botBubbleColor: '#F3F4F6',
      fontFamily: 'Inter',
      borderRadius: 16,
      position: 'bottom-right',
      launcherText: 'Chat with us',
      welcomeScreenEnabled: true,
      welcomeMessage: 'Hello! How can I help you today?',
      placeholderText: 'Type a message...',
      widgetWidth: 380,
      widgetHeight: 600,
    };
  }
}
