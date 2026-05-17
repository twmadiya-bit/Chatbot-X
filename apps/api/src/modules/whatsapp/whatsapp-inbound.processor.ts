import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { prisma } from '@chatbot-x/database';
import { ConversationStatus, MessageRole, ConversationChannel } from '@chatbot-x/database';
import { AiGatewayService } from '../ai-gateway/ai-gateway.service';
import { WhatsappService, WhatsappInboundJob } from './whatsapp.service';
import { ChatMessage } from '@chatbot-x/shared';

interface MetaMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
}

interface MetaContact {
  profile?: { name?: string };
  wa_id: string;
}

interface MetaWebhookBody {
  entry?: Array<{
    changes?: Array<{
      value?: {
        messages?: MetaMessage[];
        contacts?: MetaContact[];
      };
    }>;
  }>;
}

@Processor('whatsapp-inbound')
export class WhatsappInboundProcessor extends WorkerHost {
  private readonly logger = new Logger(WhatsappInboundProcessor.name);

  constructor(
    private readonly aiGatewayService: AiGatewayService,
    private readonly whatsappService: WhatsappService,
  ) {
    super();
  }

  async process(job: Job<WhatsappInboundJob>): Promise<void> {
    const { chatbotId, body } = job.data;

    const webhookBody = body as MetaWebhookBody;
    const entry = webhookBody.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const incomingMessages = value?.messages;
    const contacts = value?.contacts;

    if (!incomingMessages || incomingMessages.length === 0) {
      this.logger.debug(`No messages in WhatsApp webhook for chatbot ${chatbotId}, skipping`);
      return;
    }

    const incomingMsg = incomingMessages[0];
    const contact = contacts?.[0];

    if (incomingMsg.type !== 'text' || !incomingMsg.text?.body) {
      this.logger.debug(`Skipping non-text WhatsApp message type: ${incomingMsg.type}`);
      return;
    }

    const userText = incomingMsg.text.body;
    const fromPhone = incomingMsg.from;
    const senderName = contact?.profile?.name ?? null;

    this.logger.debug(`Processing WhatsApp message from ${fromPhone} for chatbot ${chatbotId}`);

    const chatbot = await prisma.chatbot.findUnique({
      where: { id: chatbotId },
      include: {
        whatsappConfig: true,
        aiModel: true,
      },
    });

    if (!chatbot) {
      this.logger.error(`Chatbot ${chatbotId} not found, dropping message`);
      return;
    }

    if (!chatbot.whatsappConfig) {
      this.logger.error(`No WhatsApp config for chatbot ${chatbotId}, dropping message`);
      return;
    }

    let conversation = await prisma.conversation.findFirst({
      where: {
        chatbotId,
        endUserId: fromPhone,
        status: ConversationStatus.OPEN,
        channel: ConversationChannel.WHATSAPP,
      },
      orderBy: { startedAt: 'desc' },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          chatbotId,
          channel: ConversationChannel.WHATSAPP,
          endUserId: fromPhone,
          endUserPhone: fromPhone,
          endUserName: senderName,
          status: ConversationStatus.OPEN,
        },
      });
      this.logger.debug(`Created new conversation ${conversation.id} for ${fromPhone}`);
    } else {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: new Date() },
      });
    }

    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: MessageRole.USER,
        content: userText,
        whatsappMessageId: incomingMsg.id,
      },
    });

    const recentMessages = await prisma.message.findMany({
      where: {
        conversationId: conversation.id,
        role: { in: [MessageRole.USER, MessageRole.ASSISTANT] },
      },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });

    const chatMessages: ChatMessage[] = recentMessages.map((m) => ({
      role: m.role === MessageRole.USER ? 'user' : 'assistant',
      content: m.content,
    }));

    const modelId = chatbot.aiModel?.modelId ?? 'claude-sonnet-4-6';

    const aiResponse = await this.aiGatewayService.chat({
      tenantId: chatbot.tenantId,
      chatbotId,
      conversationId: conversation.id,
      messages: chatMessages,
      systemPrompt: chatbot.systemPrompt,
      model: modelId,
      maxTokens: chatbot.maxTokens,
      temperature: Number(chatbot.temperature),
    });

    const accessToken = this.whatsappService.decodeAccessToken(
      chatbot.whatsappConfig.accessTokenEncrypted ?? '',
    );

    await this.whatsappService.sendMessage(
      chatbot.whatsappConfig.phoneNumberId ?? '',
      fromPhone,
      aiResponse.content,
      accessToken,
    );

    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: MessageRole.ASSISTANT,
        content: aiResponse.content,
        inputTokens: aiResponse.inputTokens,
        outputTokens: aiResponse.outputTokens,
        latencyMs: aiResponse.latencyMs,
        aiModelId: chatbot.aiModelId ?? null,
      },
    });

    await prisma.usageHourly.upsert({
      where: {
        tenantId_chatbotId_hour: {
          tenantId: chatbot.tenantId,
          chatbotId,
          hour: new Date(
            new Date().getFullYear(),
            new Date().getMonth(),
            new Date().getDate(),
            new Date().getHours(),
            0,
            0,
            0,
          ),
        },
      },
      create: {
        tenantId: chatbot.tenantId,
        chatbotId,
        hour: new Date(
          new Date().getFullYear(),
          new Date().getMonth(),
          new Date().getDate(),
          new Date().getHours(),
          0,
          0,
          0,
        ),
        inputTokens: BigInt(aiResponse.inputTokens),
        outputTokens: BigInt(aiResponse.outputTokens),
        totalTokens: BigInt(aiResponse.inputTokens + aiResponse.outputTokens),
        messageCount: 1,
        conversationCount: 0,
        rawCostUsd: 0,
        billedCostUsd: 0,
      },
      update: {
        inputTokens: { increment: BigInt(aiResponse.inputTokens) },
        outputTokens: { increment: BigInt(aiResponse.outputTokens) },
        totalTokens: { increment: BigInt(aiResponse.inputTokens + aiResponse.outputTokens) },
        messageCount: { increment: 1 },
      },
    });

    this.logger.log(
      `Processed WhatsApp message for chatbot ${chatbotId}: ${aiResponse.inputTokens}+${aiResponse.outputTokens} tokens, ${aiResponse.latencyMs}ms`,
    );
  }
}
