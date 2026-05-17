import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { CampaignsService } from './campaigns.service';
import { CampaignProcessor } from './campaign.processor';
import { CampaignsController } from './campaigns.controller';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'outbound-campaign' }),
    WhatsappModule,
  ],
  controllers: [CampaignsController],
  providers: [CampaignsService, CampaignProcessor],
  exports: [CampaignsService],
})
export class CampaignsModule {}
