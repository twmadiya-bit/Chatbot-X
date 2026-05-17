import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BillingService } from './billing.service';
import { UsageAggregationProcessor } from './usage-aggregation.processor';
import { BillingController } from './billing.controller';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'billing' }),
    BullModule.registerQueue({ name: 'usage-aggregation' }),
  ],
  controllers: [BillingController],
  providers: [BillingService, UsageAggregationProcessor],
  exports: [BillingService],
})
export class BillingModule {}
