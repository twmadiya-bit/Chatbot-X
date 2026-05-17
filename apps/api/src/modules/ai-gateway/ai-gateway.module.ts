import { Module } from '@nestjs/common';
import { AiGatewayService } from './ai-gateway.service';
import { AnthropicAdapter } from './adapters/anthropic.adapter';
import { OpenAiAdapter } from './adapters/openai.adapter';
import { GoogleAdapter } from './adapters/google.adapter';
import { SafetyLayerService } from './safety/safety-layer.service';
import { EmbeddingService } from './embedding/embedding.service';

@Module({
  providers: [
    AiGatewayService,
    AnthropicAdapter,
    OpenAiAdapter,
    GoogleAdapter,
    SafetyLayerService,
    EmbeddingService,
  ],
  exports: [AiGatewayService, SafetyLayerService, EmbeddingService],
})
export class AiGatewayModule {}
