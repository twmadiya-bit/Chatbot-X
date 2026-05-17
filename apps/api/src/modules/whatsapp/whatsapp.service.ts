import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as crypto from 'crypto';
import { prisma } from '@chatbot-x/database';
import { WhatsappConfig } from '@chatbot-x/database';

export interface WhatsappConfigDto {
  phoneNumberId: string;
  wabaId?: string;
  accessToken: string;
  webhookVerifyToken: string;
}

export interface WhatsappInboundJob {
  chatbotId: string;
  body: Record<string, unknown>;
}

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly metaGraphApiUrl = 'https://graph.facebook.com/v21.0';

  constructor(
    @InjectQueue('whatsapp-inbound') private readonly inboundQueue: Queue,
  ) {}

  verifyWebhook(
    mode: string,
    challenge: string,
    verifyToken: string,
    chatbotSlug: string,
  ): string {
    if (mode !== 'subscribe') {
      throw new BadRequestException('Invalid hub.mode');
    }

    this.logger.debug(`Webhook verification request for chatbot slug: ${chatbotSlug}`);

    return challenge;
  }

  async processInboundWebhook(
    chatbotId: string,
    rawBody: Buffer,
    body: Record<string, unknown>,
    signature: string,
  ): Promise<void> {
    const config = await prisma.whatsappConfig.findUnique({
      where: { chatbotId },
    });

    if (!config) {
      throw new NotFoundException('WhatsApp configuration not found for chatbot');
    }

    if (config.accessTokenEncrypted) {
      const accessToken = this.decodeAccessToken(config.accessTokenEncrypted);
      this.validateHmacSignature(rawBody, signature, accessToken);
    }

    await this.inboundQueue.add(
      'inbound-message',
      { chatbotId, body } satisfies WhatsappInboundJob,
      { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
    );

    this.logger.debug(`Queued inbound WhatsApp message for chatbot ${chatbotId}`);
  }

  private validateHmacSignature(rawBody: Buffer, signature: string, appSecret: string): void {
    const expectedSignature =
      'sha256=' + crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');

    const sigBuffer = Buffer.from(signature ?? '');
    const expectedBuffer = Buffer.from(expectedSignature);

    if (
      sigBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
    ) {
      this.logger.warn('WhatsApp webhook HMAC signature mismatch');
      throw new UnauthorizedException('Invalid X-Hub-Signature-256');
    }
  }

  async sendMessage(
    phoneNumberId: string,
    to: string,
    text: string,
    accessToken: string,
  ): Promise<{ messageId: string }> {
    const url = `${this.metaGraphApiUrl}/${phoneNumberId}/messages`;

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { preview_url: false, body: text },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.error(`Meta Graph API error: ${response.status} ${errorBody}`);
      throw new BadRequestException(`Failed to send WhatsApp message: ${response.status}`);
    }

    const result = (await response.json()) as { messages: Array<{ id: string }> };
    const messageId = result.messages?.[0]?.id ?? '';

    this.logger.debug(`Sent WhatsApp message to ${to}, id: ${messageId}`);

    return { messageId };
  }

  async setupWhatsappConfig(
    tenantId: string,
    chatbotId: string,
    config: WhatsappConfigDto,
  ): Promise<WhatsappConfig> {
    const chatbot = await prisma.chatbot.findFirst({
      where: { id: chatbotId, tenantId },
    });

    if (!chatbot) {
      throw new NotFoundException('Chatbot not found');
    }

    // TODO: replace base64 encoding with proper AES-256-GCM encryption using app.encryptionKey
    const accessTokenEncrypted = Buffer.from(config.accessToken).toString('base64');

    const existing = await prisma.whatsappConfig.findUnique({ where: { chatbotId } });

    if (existing) {
      return prisma.whatsappConfig.update({
        where: { chatbotId },
        data: {
          phoneNumberId: config.phoneNumberId,
          wabaId: config.wabaId ?? null,
          accessTokenEncrypted,
          webhookVerifyToken: config.webhookVerifyToken,
        },
      });
    }

    return prisma.whatsappConfig.create({
      data: {
        chatbotId,
        phoneNumberId: config.phoneNumberId,
        wabaId: config.wabaId ?? null,
        accessTokenEncrypted,
        webhookVerifyToken: config.webhookVerifyToken,
      },
    });
  }

  async getWhatsappConfig(tenantId: string, chatbotId: string): Promise<WhatsappConfig> {
    const chatbot = await prisma.chatbot.findFirst({
      where: { id: chatbotId, tenantId },
    });

    if (!chatbot) {
      throw new NotFoundException('Chatbot not found');
    }

    const config = await prisma.whatsappConfig.findUnique({ where: { chatbotId } });

    if (!config) {
      throw new NotFoundException('WhatsApp configuration not found');
    }

    return config;
  }

  decodeAccessToken(encoded: string): string {
    return Buffer.from(encoded, 'base64').toString('utf-8');
  }
}
