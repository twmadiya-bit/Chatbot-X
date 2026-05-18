import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ChatRequest, ChatResponse, StreamChunk } from '@chatbot-x/shared';
import { AiProviderError } from '@chatbot-x/shared';
import { AnthropicAdapter } from './adapters/anthropic.adapter';
import { OpenAiAdapter } from './adapters/openai.adapter';
import { GoogleAdapter } from './adapters/google.adapter';
import type { IAiProvider, AiGatewayRequest } from './interfaces/ai-provider.interface';
import { SafetyLayerService } from './safety/safety-layer.service';

@Injectable()
export class AiGatewayService {
  private readonly logger = new Logger(AiGatewayService.name);
  private readonly providers: Map<string, IAiProvider>;

  constructor(
    private readonly anthropic: AnthropicAdapter,
    private readonly openai: OpenAiAdapter,
    private readonly google: GoogleAdapter,
    private readonly safety: SafetyLayerService,
    private readonly config: ConfigService,
  ) {
    this.providers = new Map<string, IAiProvider>([
      ['anthropic', this.anthropic],
      ['openai', this.openai],
      ['google', this.google],
    ]);
  }

  async chat(request: AiGatewayRequest): Promise<ChatResponse> {
    const provider = this.resolveProvider(request.model);
    const startedAt = Date.now();

    try {
      const response = await provider.chat(request);

      const safeContent = await this.safety.filterResponse(response.content, request);
      response.content = safeContent;

      this.logger.debug(
        `Chat completed: ${request.model} | ${response.inputTokens}+${response.outputTokens} tokens | ${Date.now() - startedAt}ms`,
      );

      return response;
    } catch (err) {
      return this.handleProviderError(err, request, startedAt);
    }
  }

  async *stream(request: AiGatewayRequest): AsyncIterable<StreamChunk> {
    const provider = this.resolveProvider(request.model);

    try {
      for await (const chunk of provider.stream(request)) {
        if (chunk.type === 'text_delta' && chunk.content) {
          yield chunk;
        } else {
          yield chunk;
        }
      }
    } catch (err) {
      this.logger.error(`Stream error from ${request.model}: ${(err as Error).message}`);
      yield { type: 'error', error: 'AI provider temporarily unavailable' };
    }
  }

  resolveProvider(modelId: string): IAiProvider {
    if (modelId.startsWith('claude')) return this.providers.get('anthropic')!;
    if (modelId.startsWith('gpt') || modelId.startsWith('o1') || modelId.startsWith('o3')) return this.providers.get('openai')!;
    if (modelId.startsWith('gemini')) return this.providers.get('google')!;

    const fallback = this.config.get<string>('ai.defaultModel', 'claude-sonnet-4-6');
    this.logger.warn(`Unknown model ${modelId}, falling back to ${fallback}`);
    return this.resolveProvider(fallback);
  }

  private async handleProviderError(
    err: unknown,
    request: AiGatewayRequest,
    startedAt: number,
  ): Promise<ChatResponse> {
    const errorMsg = (err as Error).message ?? 'Unknown error';
    this.logger.error(`Provider error for model ${request.model}: ${errorMsg}`);

    // Attempt fallback to different provider
    const fallbackModel = this.getFallbackModel(request.model);
    if (fallbackModel && fallbackModel !== request.model) {
      this.logger.log(`Retrying with fallback model: ${fallbackModel}`);
      return this.chat({ ...request, model: fallbackModel });
    }

    throw new AiProviderError(request.model, errorMsg);
  }

  private getFallbackModel(modelId: string): string | null {
    const fallbackChain: Record<string, string> = {
      'claude-opus-4-7': 'claude-sonnet-4-6',
      'claude-sonnet-4-6': 'gpt-4o',
      'gpt-4o': 'gemini-2.0-pro',
      'gemini-2.0-pro': 'claude-haiku-4-5-20251001',
    };
    return fallbackChain[modelId] ?? null;
  }
}
