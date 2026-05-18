import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { prisma } from '@chatbot-x/database';
import { ConversationStatus, ConversationChannel } from '@chatbot-x/database';
import { ChatService } from '../chat/chat.service';
import { WhatsappService, WhatsappInboundJob } from './whatsapp.service';

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
    private readonly chat: ChatService,
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
      include: { whatsappConfig: true },
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
    }

    // Run full pipeline: safety → RAG → memory → tools → AI → sentiment → escalation
    const result = await this.chat.processMessage({
      tenantId: chatbot.tenantId,
      chatbotId,
      conversationId: conversation.id,
      endUserId: fromPhone,
      userMessage: userText,
      channel: 'WHATSAPP',
    });

    // Send reply via WhatsApp Cloud API
    const accessToken = this.whatsappService.decodeAccessToken(
      chatbot.whatsappConfig.accessTokenEncrypted ?? '',
    );
    await this.whatsappService.sendMessage(
      chatbot.whatsappConfig.phoneNumberId ?? '',
      fromPhone,
      result.response,
      accessToken,
    );

    // Persist both messages and update conversation state
    await prisma.$transaction([
      prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: 'USER',
          content: userText,
          whatsappMessageId: incomingMsg.id,
          inputTokens: result.inputTokens,
        },
      }),
      prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: 'ASSISTANT',
          content: result.response,
          outputTokens: result.outputTokens,
          latencyMs: result.latencyMs,
          aiModelId: chatbot.aiModelId ?? null,
          sentimentScore: result.sentimentScore,
          isEscalated: result.shouldEscalate,
        },
      }),
      prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessageAt: new Date(),
          sentiment: result.sentimentScore,
          status: result.shouldEscalate ? ConversationStatus.ESCALATED : ConversationStatus.OPEN,
        },
      }),
    ]);

    this.logger.log(
      `Processed WhatsApp message for chatbot ${chatbotId}: ${result.inputTokens}+${result.outputTokens} tokens, ${result.latencyMs}ms`,
    );
  }
}
