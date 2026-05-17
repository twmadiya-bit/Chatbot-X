import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AiGatewayModule } from '../ai-gateway/ai-gateway.module';
import { WhatsappService } from './whatsapp.service';
import { WhatsappWebhookController } from './whatsapp-webhook.controller';
import { WhatsappInboundProcessor } from './whatsapp-inbound.processor';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'whatsapp-inbound' }),
    BullModule.registerQueue({ name: 'whatsapp-outbound' }),
    AiGatewayModule,
  ],
  controllers: [WhatsappWebhookController],
  providers: [WhatsappService, WhatsappInboundProcessor],
  exports: [WhatsappService],
})
export class WhatsappModule {}
