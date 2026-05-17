import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { prisma } from '@chatbot-x/database';
import { AiGatewayService } from '../ai-gateway/ai-gateway.service';
import { MemoryService } from './memory.service';
import { BUDGET_MODEL } from '@chatbot-x/shared';

interface MemoryExtractionJobData {
  conversationId: string;
  chatbotId: string;
  endUserId: string;
}

interface ExtractedMemory {
  topic: string;
  content: string;
}

@Processor('memory-extraction')
export class MemoryExtractionProcessor extends WorkerHost {
  private readonly logger = new Logger(MemoryExtractionProcessor.name);

  constructor(
    private readonly aiGateway: AiGatewayService,
    private readonly memoryService: MemoryService,
  ) {
    super();
  }

  async process(job: Job<MemoryExtractionJobData>): Promise<void> {
    const { conversationId, chatbotId, endUserId } = job.data;
    this.logger.log(`Extracting memories for conversation ${conversationId}`);

    const messages = await prisma.message.findMany({
      where: { conversationId, role: 'USER' },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    if (messages.length === 0) {
      this.logger.debug(`No user messages found in conversation ${conversationId}`);
      return;
    }

    const messagesText = messages
      .reverse()
      .map((m) => m.content)
      .join('\n');

    const systemPrompt =
      'You are a memory extraction assistant. Extract key facts about the user from these messages. ' +
      'Return a JSON array of {topic, content} pairs. Only extract clear, reusable facts. ' +
      'If no clear facts can be extracted, return an empty array [].';

    let responseText: string;
    try {
      const response = await this.aiGateway.chat({
        tenantId: '',
        chatbotId,
        conversationId,
        messages: [{ role: 'user', content: messagesText }],
        systemPrompt,
        model: BUDGET_MODEL,
        maxTokens: 512,
        temperature: 0.1,
      });
      responseText = response.content;
    } catch (err) {
      this.logger.error(`AI call failed for memory extraction: ${(err as Error).message}`);
      throw err;
    }

    let extracted: ExtractedMemory[] = [];
    try {
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as unknown;
        if (Array.isArray(parsed)) {
          extracted = parsed.filter(
            (item): item is ExtractedMemory =>
              typeof item === 'object' &&
              item !== null &&
              typeof (item as Record<string, unknown>).topic === 'string' &&
              typeof (item as Record<string, unknown>).content === 'string',
          );
        }
      }
    } catch (err) {
      this.logger.warn(`Failed to parse memory extraction response: ${(err as Error).message}`);
      return;
    }

    if (extracted.length === 0) {
      this.logger.debug(`No extractable memories found in conversation ${conversationId}`);
      return;
    }

    const profile = await this.memoryService.getOrCreateProfile('', chatbotId, endUserId);

    for (const item of extracted) {
      await this.memoryService.saveMemory(profile.id, item.topic, item.content, 'LONG_TERM');
    }

    this.logger.log(
      `Extracted and saved ${extracted.length} memories for user ${endUserId} in chatbot ${chatbotId}`,
    );
  }
}
