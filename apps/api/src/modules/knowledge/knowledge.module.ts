import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AiGatewayModule } from '../ai-gateway/ai-gateway.module';
import { KnowledgeService } from './knowledge.service';
import { EmbeddingProcessor } from './embedding.processor';
import { KnowledgeController } from './knowledge.controller';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'embedding-generation' }),
    AiGatewayModule,
  ],
  controllers: [KnowledgeController],
  providers: [KnowledgeService, EmbeddingProcessor],
  exports: [KnowledgeService],
})
export class KnowledgeModule {}
