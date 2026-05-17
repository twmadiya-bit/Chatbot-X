import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AiGatewayModule } from '../ai-gateway/ai-gateway.module';
import { MemoryService } from './memory.service';
import { MemoryExtractionProcessor } from './memory-extraction.processor';
import { MemoryController } from './memory.controller';

@Module({
  imports: [
    AiGatewayModule,
    BullModule.registerQueue({ name: 'memory-extraction' }),
  ],
  controllers: [MemoryController],
  providers: [MemoryService, MemoryExtractionProcessor],
  exports: [MemoryService],
})
export class MemoryModule {}
