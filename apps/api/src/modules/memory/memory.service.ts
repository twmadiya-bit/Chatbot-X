import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { prisma } from '@chatbot-x/database';
import type { EndUserProfile, UserMemory } from '@chatbot-x/database';
import { addDays } from 'date-fns';

export type MemoryType = 'SESSION' | 'SHORT_TERM' | 'LONG_TERM' | 'PROFILE';

@Injectable()
export class MemoryService {
  private readonly logger = new Logger(MemoryService.name);

  constructor(
    @InjectQueue('memory-extraction') private readonly memoryQueue: Queue,
  ) {}

  async getOrCreateProfile(
    tenantId: string,
    chatbotId: string,
    endUserId: string,
  ): Promise<EndUserProfile> {
    const profile = await prisma.endUserProfile.upsert({
      where: { chatbotId_endUserId: { chatbotId, endUserId } },
      update: { updatedAt: new Date() },
      create: { tenantId, chatbotId, endUserId },
    });
    return profile;
  }

  async getMemoryContext(chatbotId: string, endUserId: string): Promise<string> {
    const profile = await prisma.endUserProfile.findUnique({
      where: { chatbotId_endUserId: { chatbotId, endUserId } },
    });

    if (!profile) {
      return '';
    }

    const memories = await prisma.userMemory.findMany({
      where: {
        endUserProfileId: profile.id,
        memoryType: { in: ['SHORT_TERM', 'LONG_TERM'] },
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    if (memories.length === 0) {
      return '';
    }

    const lines = memories.map((m: UserMemory) => `- [${m.memoryType}] ${m.topic}: ${m.content}`);
    return `User memory context:\n${lines.join('\n')}`;
  }

  async saveMemory(
    endUserProfileId: string,
    topic: string,
    content: string,
    memoryType: MemoryType,
  ): Promise<UserMemory> {
    const expiresAt = memoryType === 'SHORT_TERM' ? addDays(new Date(), 30) : null;

    const memory = await prisma.userMemory.create({
      data: {
        endUserProfileId,
        topic,
        content,
        memoryType,
        expiresAt,
      },
    });

    this.logger.debug(`Saved ${memoryType} memory for profile ${endUserProfileId}: ${topic}`);
    return memory;
  }

  async extractAndSaveMemories(
    conversationId: string,
    chatbotId: string,
    endUserId: string,
  ): Promise<void> {
    await this.memoryQueue.add(
      'extract-memories',
      { conversationId, chatbotId, endUserId },
      { attempts: 2, backoff: { type: 'fixed', delay: 3000 } },
    );
    this.logger.debug(`Queued memory extraction for conversation ${conversationId}`);
  }

  async cleanExpiredMemories(): Promise<number> {
    const result = await prisma.userMemory.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    this.logger.log(`Cleaned ${result.count} expired memory records`);
    return result.count;
  }
}
