import type { ChatRequest, ChatResponse, StreamChunk, ToolDefinition } from '@chatbot-x/shared';

export interface IAiProvider {
  readonly providerKey: string;
  readonly supportedModels: string[];

  chat(request: ChatRequest): Promise<ChatResponse>;
  stream(request: ChatRequest): AsyncIterable<StreamChunk>;
  isModelSupported(modelId: string): boolean;
}

export interface IEmbeddingProvider {
  embed(texts: string[], model?: string): Promise<number[][]>;
}

export interface AiGatewayRequest extends ChatRequest {
  preferredModel?: string;
  fallbackModels?: string[];
  taskType?: 'chat' | 'classification' | 'summarization' | 'extraction';
}

export interface ToolExecutionContext {
  tenantId: string;
  chatbotId: string;
  conversationId: string;
  tool: ToolDefinition;
  input: Record<string, unknown>;
}
