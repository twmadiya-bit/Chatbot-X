import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ChatRequest, ChatResponse, StreamChunk } from '@chatbot-x/shared';
import type { IAiProvider } from '../interfaces/ai-provider.interface';

@Injectable()
export class GoogleAdapter implements IAiProvider {
  readonly providerKey = 'google';
  readonly supportedModels = ['gemini-2.0-flash', 'gemini-2.0-pro', 'gemini-1.5-pro'];

  private readonly client: GoogleGenerativeAI;
  private readonly logger = new Logger(GoogleAdapter.name);

  constructor(private readonly config: ConfigService) {
    this.client = new GoogleGenerativeAI(
      this.config.get<string>('ai.googleApiKey') ?? '',
    );
  }

  isModelSupported(modelId: string): boolean {
    return this.supportedModels.includes(modelId);
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const start = Date.now();
    const model = this.client.getGenerativeModel({
      model: request.model,
      systemInstruction: this.buildSystemPrompt(request),
    });

    const history = request.messages
      .filter((m) => m.role !== 'system')
      .slice(0, -1)
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) }],
      }));

    const lastMessage = request.messages.at(-1);
    const userInput = typeof lastMessage?.content === 'string' ? lastMessage.content : '';

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(userInput);
    const response = result.response;

    const usageMetadata = response.usageMetadata;

    return {
      content: response.text(),
      inputTokens: usageMetadata?.promptTokenCount ?? 0,
      outputTokens: usageMetadata?.candidatesTokenCount ?? 0,
      latencyMs: Date.now() - start,
      stopReason: 'end_turn',
    };
  }

  async *stream(request: ChatRequest): AsyncIterable<StreamChunk> {
    const model = this.client.getGenerativeModel({
      model: request.model,
      systemInstruction: this.buildSystemPrompt(request),
    });

    const lastMessage = request.messages.at(-1);
    const userInput = typeof lastMessage?.content === 'string' ? lastMessage.content : '';

    const result = await model.generateContentStream(userInput);

    let inputTokens = 0;
    let outputTokens = 0;

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) yield { type: 'text_delta', content: text };

      if (chunk.usageMetadata) {
        inputTokens = chunk.usageMetadata.promptTokenCount ?? 0;
        outputTokens = chunk.usageMetadata.candidatesTokenCount ?? 0;
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
