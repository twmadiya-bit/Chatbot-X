import { Module } from '@nestjs/common';
import { ChatbotsService } from './chatbots.service';
import { ChatbotsController } from './chatbots.controller';

@Module({
  providers: [ChatbotsService],
  exports: [ChatbotsService],
  controllers: [ChatbotsController],
})
export class ChatbotsModule {}
