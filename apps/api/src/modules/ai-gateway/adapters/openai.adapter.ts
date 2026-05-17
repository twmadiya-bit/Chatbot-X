import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import type { ChatRequest, ChatResponse, StreamChunk } from '@chatbot-x/shared';
import type { IAiProvider } from '../interfaces/ai-provider.interface';

@Injectable()
export class OpenAiAdapter implements IAiProvider {
  readonly providerKey = 'openai';
  readonly supportedModels = ['gpt-4o', 'gpt-4o-mini', 'o1-mini', 'o3-mini'];

  private readonly client: OpenAI;
  private readonly logger = new Logger(OpenAiAdapter.name);

  constructor(private readonly config: ConfigService) {
    this.client = new OpenAI({
      apiKey: this.config.get<string>('ai.openaiApiKey'),
    });
  }

  isModelSupported(modelId: string): boolean {
    return this.supportedModels.includes(modelId);
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const start = Date.now();

    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'system', content: this.buildSystemPrompt(request) },
      ...request.messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
        })),
    ];

    const tools = request.tools?.map((t) => ({
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.inputSchema,
      },
    }));

    const response = await this.client.chat.completions.create({
      model: request.model,
      max_tokens: request.maxTokens,
      temperature: request.temperature,
      messages,
      tools: tools && tools.length > 0 ? tools : undefined,
    });

    const choice = response.choices[0];
    const content = choice.message.content ?? '';

    const toolCalls = choice.message.tool_calls?.map((tc) => ({
      id: tc.id,
      name: tc.function.name,
      input: JSON.parse(tc.function.arguments) as Record<string, unknown>,
    }));

    return {
      content,
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
      latencyMs: Date.now() - start,
      toolCalls: toolCalls && toolCalls.length > 0 ? toolCalls : undefined,
      stopReason: choice.finish_reason === 'tool_calls' ? 'tool_use' : 'end_turn',
    };
  }

  async *stream(request: ChatRequest): AsyncIterable<StreamChunk> {
    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'system', content: this.buildSystemPrompt(request) },
      ...request.messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
        })),
    ];

    const stream = await this.client.chat.completions.create({
      model: request.model,
      max_tokens: request.maxTokens,
      temperature: request.temperature,
      messages,
      stream: true,
      stream_options: { include_usage: true },
    });

    let inputTokens = 0;
    let outputTokens = 0;

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield { type: 'text_delta', content: delta };

      if (chunk.usage) {
        inputTokens = chunk.usage.prompt_tokens;
        outputTokens = chunk.usage.completion_tokens;
      }
    }

    yield { type: 'message_done', usage: { inputTokens, outputTokens } };
  }

  private buildSystemPrompt(request: ChatRequest): string {
    let system = request.systemPrompt;
    if (request.ragContext) system += `\n\n[KNOWLEDGE BASE]\n${request.ragContext}\n[END]`;
    if (request.userMemory) system += `\n\n[USER CONTEXT]\n${request.userMemory}\n[END]`;
    return system;
  }
}
