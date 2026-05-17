import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { prisma } from '@chatbot-x/database';
import type { KnowledgeBase, KnowledgeDocument } from '@chatbot-x/database';
import { EmbeddingService } from '../ai-gateway/embedding/embedding.service';

export interface AddDocumentDto {
  title?: string;
  sourceType: 'PDF' | 'URL' | 'TEXT' | 'DOCX' | 'FAQ';
  sourceUrl?: string;
  content?: string;
  fileUrl?: string;
}

@Injectable()
export class KnowledgeService {
  private readonly logger = new Logger(KnowledgeService.name);

  constructor(
    @InjectQueue('embedding-generation') private readonly embeddingQueue: Queue,
    private readonly embeddingService: EmbeddingService,
  ) {}

  async getOrCreateKnowledgeBase(chatbotId: string): Promise<KnowledgeBase> {
    const existing = await prisma.knowledgeBase.findUnique({ where: { chatbotId } });
    if (existing) {
      return existing;
    }

    const chatbot = await prisma.chatbot.findUnique({ where: { id: chatbotId } });
    if (!chatbot) {
      throw new NotFoundException(`Chatbot ${chatbotId} not found`);
    }

    this.logger.log(`Creating knowledge base for chatbot ${chatbotId}`);
    return prisma.knowledgeBase.create({
      data: {
        chatbotId,
        name: `${chatbot.name} Knowledge Base`,
      },
    });
  }

  async addDocument(chatbotId: string, data: AddDocumentDto): Promise<KnowledgeDocument> {
    const kb = await this.getOrCreateKnowledgeBase(chatbotId);

    const document = await prisma.knowledgeDocument.create({
      data: {
        knowledgeBaseId: kb.id,
        title: data.title ?? null,
        sourceType: data.sourceType,
        sourceUrl: data.sourceUrl ?? null,
        content: data.content ?? null,
        fileUrl: data.fileUrl ?? null,
        status: 'PROCESSING',
      },
    });

    await this.embeddingQueue.add(
      'embed-document',
      { documentId: document.id },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    );

    this.logger.log(`Queued embedding generation for document ${document.id}`);
    return document;
  }

  async listDocuments(chatbotId: string): Promise<KnowledgeDocument[]> {
    const kb = await prisma.knowledgeBase.findUnique({ where: { chatbotId } });
    if (!kb) {
      return [];
    }

    return prisma.knowledgeDocument.findMany({
      where: { knowledgeBaseId: kb.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteDocument(chatbotId: string, documentId: string): Promise<void> {
    const kb = await prisma.knowledgeBase.findUnique({ where: { chatbotId } });
    if (!kb) {
      throw new NotFoundException(`Knowledge base for chatbot ${chatbotId} not found`);
    }

    const document = await prisma.knowledgeDocument.findFirst({
      where: { id: documentId, knowledgeBaseId: kb.id },
    });

    if (!document) {
      throw new NotFoundException(`Document ${documentId} not found`);
    }

    await prisma.documentChunk.deleteMany({ where: { documentId } });
    await prisma.knowledgeDocument.delete({ where: { id: documentId } });

    this.logger.log(`Deleted document ${documentId} and its chunks`);
  }

  async searchSimilar(chatbotId: string, query: string, topK = 5): Promise<string> {
    const queryEmbedding = await this.embeddingService.embedSingle(query);
    const vectorString = `[${queryEmbedding.join(',')}]`;

    const rows = await prisma.$queryRawUnsafe<Array<{ content: string }>>(
      `SELECT dc.content
       FROM document_chunks dc
       JOIN knowledge_documents kd ON dc.document_id = kd.id
       JOIN knowledge_bases kb ON kd.knowledge_base_id = kb.id
       WHERE kb.chatbot_id = $1
       ORDER BY dc.embedding <-> $2::vector
       LIMIT $3`,
      chatbotId,
      vectorString,
      topK,
    );

    if (rows.length === 0) {
      return '';
    }

    return rows.map((r) => r.content).join('\n\n');
  }
}
