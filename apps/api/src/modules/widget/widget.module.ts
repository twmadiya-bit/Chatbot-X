import { Module } from '@nestjs/common';
import { AiGatewayModule } from '../ai-gateway/ai-gateway.module';
import { WidgetService } from './widget.service';
import { WidgetGateway } from './widget.gateway';
import { WidgetController } from './widget.controller';

@Module({
  imports: [AiGatewayModule],
  providers: [WidgetService, WidgetGateway],
  controllers: [WidgetController],
})
export class WidgetModule {}
