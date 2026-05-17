import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { prisma } from '@chatbot-x/database';
import { WhatsappService } from '../whatsapp/whatsapp.service';

interface CampaignJobData {
  campaignId: string;
  endUserId: string;
  phone: string | null;
}

@Processor('outbound-campaign')
export class CampaignProcessor extends WorkerHost {
  private readonly logger = new Logger(CampaignProcessor.name);

  constructor(private readonly whatsappService: WhatsappService) {
    super();
  }

  async process(job: Job<CampaignJobData>): Promise<void> {
    const { campaignId, endUserId, phone } = job.data;
    this.logger.log(`Processing campaign message: campaign=${campaignId}, user=${endUserId}`);

    const campaign = await prisma.outboundCampaign.findUnique({
      where: { id: campaignId },
      include: {
        chatbot: {
          include: { whatsappConfig: true },
        },
      },
    });

    if (!campaign) {
      this.logger.warn(`Campaign ${campaignId} not found, skipping`);
      return;
    }

    const send = await prisma.campaignSend.create({
      data: {
        campaignId,
        endUserId,
        endUserPhone: phone ?? null,
        status: 'PENDING',
      },
    });

    const channels = campaign.channel as string[];
    const isWhatsapp = channels.includes('WHATSAPP');

    if (isWhatsapp && phone) {
      const whatsappConfig = campaign.chatbot.whatsappConfig;

      if (!whatsappConfig?.phoneNumberId || !whatsappConfig.accessTokenEncrypted) {
        this.logger.warn(
          `WhatsApp not configured for chatbot ${campaign.chatbotId}, skipping send`,
        );
        await prisma.campaignSend.update({
          where: { id: send.id },
          data: {
            status: 'FAILED',
            error: 'WhatsApp configuration missing',
            failedAt: new Date(),
          },
        });
        return;
      }

      try {
        const accessToken = this.whatsappService.decodeAccessToken(
          whatsappConfig.accessTokenEncrypted,
        );

        await this.whatsappService.sendMessage(
          whatsappConfig.phoneNumberId,
          phone,
          campaign.messageTemplate,
          accessToken,
        );

        await prisma.campaignSend.update({
          where: { id: send.id },
          data: { status: 'SENT', sentAt: new Date() },
        });

        this.logger.log(
          `Sent WhatsApp campaign message to ${phone} for campaign ${campaignId}`,
        );
      } catch (err) {
        const errorMsg = (err as Error).message;
        this.logger.error(
          `Failed to send WhatsApp message to ${phone} for campaign ${campaignId}: ${errorMsg}`,
        );

        await prisma.campaignSend.update({
          where: { id: send.id },
          data: { status: 'FAILED', error: errorMsg, failedAt: new Date() },
        });

        throw err;
      }
    } else {
      this.logger.debug(
        `Campaign ${campaignId} channel not WhatsApp or no phone number, skipping`,
      );
      await prisma.campaignSend.update({
        where: { id: send.id },
        data: { status: 'FAILED', error: 'Unsupported channel or missing phone', failedAt: new Date() },
      });
    }

    await prisma.outboundCampaign.update({
      where: { id: campaignId },
      data: { lastRunAt: new Date() },
    });
  }
}
