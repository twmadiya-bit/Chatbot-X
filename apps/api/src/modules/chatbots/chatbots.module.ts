import { Module } from '@nestjs/common';
import { ChatbotsService } from './chatbots.service';
import { ChatbotsController } from './chatbots.controller';
import { AiGatewayModule } from '../ai-gateway/ai-gateway.module';

@Module({
  imports: [AiGatewayModule],
  providers: [ChatbotsService],
  exports: [ChatbotsService],
  controllers: [ChatbotsController],
})
export class ChatbotsModule {}
