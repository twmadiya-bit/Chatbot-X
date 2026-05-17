import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { IntegrationsService } from './integrations.service';
import { IntegrationSyncProcessor } from './integration-sync.processor';
import { IntegrationsController } from './integrations.controller';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'integration-sync' }),
  ],
  controllers: [IntegrationsController],
  providers: [IntegrationsService, IntegrationSyncProcessor],
  exports: [IntegrationsService],
})
export class IntegrationsModule {}
