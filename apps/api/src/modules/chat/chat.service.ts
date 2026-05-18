import { Injectable, Logger } from '@nestjs/common';
import { prisma } from '@chatbot-x/database';
import type { StreamChunk, ChatMessage, ToolDefinition, ToolCall } from '@chatbot-x/shared';
import { FEATURES, MAX_CONVERSATION_TURNS } from '@chatbot-x/shared';
import { AiGatewayService } from '../ai-gateway/ai-gateway.service';
import { SafetyLayerService } from '../ai-gateway/safety/safety-layer.service';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { MemoryService } from '../memory/memory.service';
import { IntegrationsService } from '../integrations/integrations.service';
import { NotificationsService } from '../notifications/notifications.service';

export interface ProcessMessageParams {
  tenantId: string;
  chatbotId: string;
  conversationId: string;
  endUserId: string;
  userMessage: string;
  channel: 'WIDGET' | 'WHATSAPP';
  mediaUrl?: string;
  mediaType?: string;
}

export interface ProcessMessageResult {
  response: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  shouldEscalate: boolean;
  sentimentScore: number;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly aiGateway: AiGatewayService,
    private readonly safety: SafetyLayerService,
    private readonly knowledge: KnowledgeService,
    private readonly memory: MemoryService,
    private readonly integrations: IntegrationsService,
    private readonly notifications: NotificationsService,
  ) {}

  async processMessage(params: ProcessMessageParams): Promise<ProcessMessageResult> {
    const start = Date.now();
    const { tenantId, chatbotId, conversationId, endUserId, userMessage } = params;

    // 1. Load chatbot config
    const chatbot = await prisma.chatbot.findUniqueOrThrow({
      where: { id: chatbotId },
      include: { aiModel: true, handoffConfig: true },
    });

    // 2. Safety check on input
    const safetyResult = this.safety.checkInput(userMessage);
    if (!safetyResult.passed) {
      return {
        response: "I'm only able to help with topics related to this service. How can I assist you?",
        inputTokens: 0,
        outputTokens: 0,
        latencyMs: Date.now() - start,
        shouldEscalate: false,
        sentimentScore: 0,
      };
    }

    const sanitizedInput = safetyResult.sanitizedInput ?? userMessage;

    // 3. Load conversation history (last N turns)
    const history = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: MAX_CONVERSATION_TURNS,
    });
    const messages: ChatMessage[] = history
      .reverse()
      .filter((m) => m.role === 'USER' || m.role === 'ASSISTANT')
      .map((m) => ({ role: m.role.toLowerCase() as 'user' | 'assistant', content: m.content }));

    messages.push({ role: 'user', content: sanitizedInput });

    // 4. RAG context
    let ragContext: string | undefined;
    try {
      ragContext = await this.knowledge.searchSimilar(chatbotId, sanitizedInput);
    } catch {
      // Knowledge base may not exist — non-fatal
    }

    // 5. User memory
    let userMemory: string | undefined;
    try {
      userMemory = await this.memory.getMemoryContext(chatbotId, endUserId);
    } catch {
      // Non-fatal
    }

    // 6. Resolve tools from entitlements
    const tools = await this.resolveTools(chatbotId);

    const modelId = chatbot.aiModel?.modelId ?? 'claude-sonnet-4-6';

    // 7. First AI call
    let aiResponse = await this.aiGateway.chat({
      tenantId,
      chatbotId,
      conversationId,
      messages,
      systemPrompt: chatbot.systemPrompt,
      model: modelId,
      maxTokens: chatbot.maxTokens,
      temperature: Number(chatbot.temperature),
      tools: tools.length > 0 ? tools : undefined,
      ragContext,
      userMemory,
    });

    // 8. Agentic tool execution loop (max 3 iterations)
    let iterations = 0;
    while (aiResponse.toolCalls && aiResponse.toolCalls.length > 0 && iterations < 3) {
      const toolResults = await this.executeTools(chatbotId, aiResponse.toolCalls);
      messages.push({ role: 'assistant', content: aiResponse.content });
      for (const result of toolResults) {
        messages.push({ role: 'tool', content: result.content, toolCallId: result.toolCallId });
      }
      aiResponse = await this.aiGateway.chat({
        tenantId, chatbotId, conversationId, messages,
        systemPrompt: chatbot.systemPrompt, model: modelId,
        maxTokens: chatbot.maxTokens, temperature: Number(chatbot.temperature),
        tools, ragContext, userMemory,
      });
      iterations++;
    }

    // 9. Sentiment analysis
    const allMessages = [...messages, { role: 'assistant' as const, content: aiResponse.content }];
    const sentimentScore = this.safety.analyzeSentiment(
      allMessages.map((m) => ({ role: typeof m.role === 'string' ? m.role : 'user', content: typeof m.content === 'string' ? m.content : '' })),
    );

    // 10. Escalation check
    const hc = chatbot.handoffConfig;
    const shouldEscalate = hc?.isEnabled
      ? this.safety.shouldEscalate(sentimentScore, 0.7, 0, {
          sentiment: Number(hc.sentimentThreshold),
          confidence: Number(hc.confidenceThreshold),
          maxUnanswered: hc.maxUnansweredTurns,
        })
      : false;

    // 11. Queue memory extraction (fire-and-forget)
    this.memory.extractAndSaveMemories(conversationId, chatbotId, endUserId).catch(() => {});

    // 12. Fire notification emails (fire-and-forget)
    if (shouldEscalate || sentimentScore < -0.6) {
      this.sendAlertNotifications(tenantId, chatbot.name, conversationId, endUserId, sentimentScore, shouldEscalate).catch(() => {});
    }

    return {
      response: aiResponse.content,
      inputTokens: aiResponse.inputTokens,
      outputTokens: aiResponse.outputTokens,
      latencyMs: Date.now() - start,
      shouldEscalate,
      sentimentScore,
    };
  }

  async *streamMessage(params: ProcessMessageParams): AsyncIterable<StreamChunk> {
    const { tenantId, chatbotId, conversationId, endUserId, userMessage } = params;

    const safetyResult = this.safety.checkInput(userMessage);
    if (!safetyResult.passed) {
      yield { type: 'text_delta', content: "I'm only able to help with topics related to this service." };
      yield { type: 'message_done', usage: { inputTokens: 0, outputTokens: 0 } };
      return;
    }

    const chatbot = await prisma.chatbot.findUniqueOrThrow({
      where: { id: chatbotId },
      include: { aiModel: true },
    });

    const history = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: MAX_CONVERSATION_TURNS,
    });
    const messages: ChatMessage[] = history
      .reverse()
      .filter((m) => m.role === 'USER' || m.role === 'ASSISTANT')
      .map((m) => ({ role: m.role.toLowerCase() as 'user' | 'assistant', content: m.content }));
    messages.push({ role: 'user', content: safetyResult.sanitizedInput ?? userMessage });

    let ragContext: string | undefined;
    let userMemory: string | undefined;
    try { ragContext = await this.knowledge.searchSimilar(chatbotId, userMessage); } catch {}
    try { userMemory = await this.memory.getMemoryContext(chatbotId, endUserId); } catch {}

    const modelId = chatbot.aiModel?.modelId ?? 'claude-sonnet-4-6';

    yield* this.aiGateway.stream({
      tenantId, chatbotId, conversationId, messages,
      systemPrompt: chatbot.systemPrompt, model: modelId,
      maxTokens: chatbot.maxTokens, temperature: Number(chatbot.temperature),
      ragContext, userMemory,
    });

    this.memory.extractAndSaveMemories(conversationId, chatbotId, endUserId).catch(() => {});
  }

  private async sendAlertNotifications(
    tenantId: string,
    chatbotName: string,
    conversationId: string,
    endUserId: string,
    sentimentScore: number,
    shouldEscalate: boolean,
  ): Promise<void> {
    const [tenant, prefs] = await Promise.all([
      prisma.tenant.findUnique({ where: { id: tenantId }, select: { email: true } }),
      prisma.notificationPreference.findUnique({ where: { tenantId } }),
    ]);
    if (!tenant) return;

    if (shouldEscalate && (prefs?.handoffEmails ?? true)) {
      await this.notifications.sendHandoffAlert(tenant.email, chatbotName, conversationId, endUserId);
    } else if (!shouldEscalate && sentimentScore < -0.6 && (prefs?.sentimentAlertEmails ?? true)) {
      await this.notifications.sendSentimentAlert(tenant.email, chatbotName, conversationId, sentimentScore);
    }
  }

  private async resolveTools(chatbotId: string): Promise<ToolDefinition[]> {
    const chatbot = await prisma.chatbot.findUnique({
      where: { id: chatbotId },
      include: {
        industryPlan: {
          include: { planFeatures: { include: { feature: true } } },
        },
      },
    });

    if (!chatbot?.industryPlan) return [];

    const tools: ToolDefinition[] = [];
    for (const pf of chatbot.industryPlan.planFeatures) {
      if (!pf.isEnabled || !pf.feature.requiresIntegration) continue;
      switch (pf.feature.key) {
        case FEATURES.INVENTORY_SYNC:
          tools.push({
            name: 'check_inventory',
            description: 'Check product availability and stock levels',
            inputSchema: { type: 'object', properties: { query: { type: 'string', description: 'Product name or SKU to search' } }, required: ['query'] },
          });
          break;
        case FEATURES.ORDER_TRACKING:
          tools.push({
            name: 'track_order',
            description: 'Look up order status and tracking information',
            inputSchema: { type: 'object', properties: { orderId: { type: 'string' } }, required: ['orderId'] },
          });
          break;
        case FEATURES.APPOINTMENT_BOOKING:
          tools.push({
            name: 'check_availability',
            description: 'Check available appointment slots',
            inputSchema: { type: 'object', properties: { date: { type: 'string', description: 'YYYY-MM-DD' }, service: { type: 'string' } }, required: ['date'] },
          });
          break;
      }
    }
    return tools;
  }

  private async executeTools(chatbotId: string, toolCalls: ToolCall[]) {
    const results: Array<{ toolCallId: string; content: string }> = [];
    for (const tc of toolCalls) {
      try {
        let content = '';
        switch (tc.name) {
          case 'check_inventory': {
            const query = (tc.input.query as string) ?? '';
            const result = await this.integrations.checkInventory(chatbotId, query);
            content = JSON.stringify(result);
            break;
          }
          case 'track_order':
            content = JSON.stringify({ status: 'Tool not yet connected. Please check your integrations.' });
            break;
          case 'check_availability':
            content = JSON.stringify({ message: 'Calendar integration required. Please connect your calendar in settings.' });
            break;
          default:
            content = JSON.stringify({ error: `Unknown tool: ${tc.name}` });
        }
        results.push({ toolCallId: tc.id, content });
      } catch (err) {
        results.push({ toolCallId: tc.id, content: JSON.stringify({ error: (err as Error).message }) });
      }
    }
    return results;
  }
}
