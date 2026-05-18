import { Module } from '@nestjs/common';
import { ChatModule } from '../chat/chat.module';
import { WidgetService } from './widget.service';
import { WidgetGateway } from './widget.gateway';
import { WidgetController } from './widget.controller';

@Module({
  imports: [ChatModule],
  providers: [WidgetService, WidgetGateway],
  controllers: [WidgetController],
})
export class WidgetModule {}
