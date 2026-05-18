import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { AiGatewayModule } from '../ai-gateway/ai-gateway.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { MemoryModule } from '../memory/memory.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AiGatewayModule, KnowledgeModule, MemoryModule, IntegrationsModule, NotificationsModule],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
