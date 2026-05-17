import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import type { ChatRequest, ChatResponse, StreamChunk } from '@chatbot-x/shared';
import type { IAiProvider } from '../interfaces/ai-provider.interface';

@Injectable()
export class AnthropicAdapter implements IAiProvider {
  readonly providerKey = 'anthropic';
  readonly supportedModels = [
    'claude-opus-4-7',
    'claude-sonnet-4-6',
    'claude-haiku-4-5-20251001',
  ];

  private readonly client: Anthropic;
  private readonly logger = new Logger(AnthropicAdapter.name);

  constructor(private readonly config: ConfigService) {
    this.client = new Anthropic({
      apiKey: this.config.get<string>('ai.anthropicApiKey'),
    });
  }

  isModelSupported(modelId: string): boolean {
    return this.supportedModels.includes(modelId);
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const start = Date.now();

    const messages = this.buildMessages(request);

    const response = await this.client.messages.create({
      model: request.model,
      max_tokens: request.maxTokens,
      temperature: request.temperature,
      system: this.buildSystemPrompt(request),
      messages,
      tools: request.tools?.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.inputSchema as Anthropic.Tool['input_schema'],
      })),
    });

    const textContent = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');

    const toolCalls = response.content
      .filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
      .map((b) => ({ id: b.id, name: b.name, input: b.input as Record<string, unknown> }));

    return {
      content: textContent,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      latencyMs: Date.now() - start,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      stopReason: this.mapStopReason(response.stop_reason),
    };
  }

  async *stream(request: ChatRequest): AsyncIterable<StreamChunk> {
    const messages = this.buildMessages(request);

    const stream = this.client.messages.stream({
      model: request.model,
      max_tokens: request.maxTokens,
      temperature: request.temperature,
      system: this.buildSystemPrompt(request),
      messages,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield { type: 'text_delta', content: event.delta.text };
      } else if (event.type === 'message_delta' && event.usage) {
        yield {
          type: 'message_done',
          usage: {
            inputTokens: (await stream.finalMessage()).usage.input_tokens,
            outputTokens: event.usage.output_tokens,
          },
        };
      }
    }
  }

  private buildSystemPrompt(request: ChatRequest): string {
    let system = request.systemPrompt;

    if (request.ragContext) {
      system += `\n\n[KNOWLEDGE BASE CONTEXT]\n${request.ragContext}\n[END CONTEXT]`;
    }

    if (request.userMemory) {
      system += `\n\n[USER MEMORY]\n${request.userMemory}\n[END USER MEMORY]`;
    }

    return system;
  }

  private buildMessages(request: ChatRequest): Anthropic.MessageParam[] {
    return request.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
      }));
  }

  private mapStopReason(reason: string | null): ChatResponse['stopReason'] {
    const map: Record<string, ChatResponse['stopReason']> = {
      end_turn: 'end_turn',
      tool_use: 'tool_use',
      max_tokens: 'max_tokens',
      stop_sequence: 'stop_sequence',
    };
    return map[reason ?? 'end_turn'] ?? 'end_turn';
  }
}
