import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BillingService } from './billing.service';
import { UsageAggregationProcessor } from './usage-aggregation.processor';
import { BillingController } from './billing.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'billing' }),
    BullModule.registerQueue({ name: 'usage-aggregation' }),
    NotificationsModule,
  ],
  controllers: [BillingController],
  providers: [BillingService, UsageAggregationProcessor],
  exports: [BillingService],
})
export class BillingModule {}
