export type AiProviderKey = 'anthropic' | 'openai' | 'google' | 'mistral' | 'cohere' | 'groq';

export type ModelTier = 'BUDGET' | 'STANDARD' | 'PREMIUM';

export interface AiModelInfo {
  modelId: string;
  displayName: string;
  provider: AiProviderKey;
  tier: ModelTier;
  supportsVision: boolean;
  supportsToolUse: boolean;
  supportsStreaming: boolean;
  contextWindow: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | ContentBlock[];
  toolCallId?: string;
  toolName?: string;
}

export interface ContentBlock {
  type: 'text' | 'image' | 'tool_use' | 'tool_result';
  text?: string;
  imageUrl?: string;
  imageMediaType?: string;
  toolUseId?: string;
  toolName?: string;
  toolInput?: Record<string, unknown>;
  toolContent?: string;
}

export interface ChatRequest {
  tenantId: string;
  chatbotId: string;
  conversationId: string;
  messages: ChatMessage[];
  systemPrompt: string;
  model: string;
  maxTokens: number;
  temperature: number;
  tools?: ToolDefinition[];
  ragContext?: string;
  userMemory?: string;
}

export interface ChatResponse {
  content: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  toolCalls?: ToolCall[];
  stopReason: 'end_turn' | 'tool_use' | 'max_tokens' | 'stop_sequence';
}

export interface StreamChunk {
  type: 'text_delta' | 'tool_use' | 'message_done' | 'error';
  content?: string;
  toolCall?: ToolCall;
  usage?: { inputTokens: number; outputTokens: number };
  error?: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResult {
  toolCallId: string;
  content: string;
  isError?: boolean;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  rawCostUsd: number;
  billedCostUsd: number;
}

export interface BrandingConfig {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  userBubbleColor: string;
  botBubbleColor: string;
  fontFamily: string;
  borderRadius: number;
  logoUrl?: string;
  avatarUrl?: string;
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  launcherText: string;
  headerTitle?: string;
  headerSubtitle?: string;
  welcomeScreenEnabled: boolean;
  welcomeMessage: string;
  placeholderText: string;
  widgetWidth: number;
  widgetHeight: number;
}

export interface WidgetConfig {
  chatbotId: string;
  branding: BrandingConfig;
  welcomeMessage: string;
  quickReplies?: string[];
  imageUploadEnabled: boolean;
  voiceInputEnabled: boolean;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T = void> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export type SentimentScore = number; // -1.0 (negative) to 1.0 (positive)

export interface ConversationSentiment {
  overall: SentimentScore;
  trend: 'improving' | 'declining' | 'stable';
  shouldEscalate: boolean;
}
