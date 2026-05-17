import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { prisma } from '@chatbot-x/database';
import { EmbeddingService } from '../ai-gateway/embedding/embedding.service';
import { CHUNK_SIZE_TOKENS, CHUNK_OVERLAP_TOKENS } from '@chatbot-x/shared';

interface EmbeddingJobData {
  documentId: string;
}

@Processor('embedding-generation')
export class EmbeddingProcessor extends WorkerHost {
  private readonly logger = new Logger(EmbeddingProcessor.name);

  // ~4 characters per token approximation
  private readonly CHARS_PER_TOKEN = 4;

  constructor(private readonly embeddingService: EmbeddingService) {
    super();
  }

  async process(job: Job<EmbeddingJobData>): Promise<void> {
    const { documentId } = job.data;
    this.logger.log(`Processing embedding job for document ${documentId}`);

    try {
      const document = await prisma.knowledgeDocument.findUnique({
        where: { id: documentId },
      });

      if (!document) {
        this.logger.warn(`Document ${documentId} not found, skipping`);
        return;
      }

      const rawContent = document.content ?? '';
      if (!rawContent.trim()) {
        this.logger.warn(`Document ${documentId} has no content to embed`);
        await prisma.knowledgeDocument.update({
          where: { id: documentId },
          data: { status: 'FAILED' },
        });
        return;
      }

      const chunks = this.chunkText(rawContent);
      this.logger.log(`Document ${documentId} split into ${chunks.length} chunks`);

      await prisma.documentChunk.deleteMany({ where: { documentId } });

      const batchSize = 20;
      for (let batchStart = 0; batchStart < chunks.length; batchStart += batchSize) {
        const batch = chunks.slice(batchStart, batchStart + batchSize);
        const embeddings = await this.embeddingService.embed(batch);

        const chunkRecords = batch.map((content, idx) => ({
          documentId,
          chunkIndex: batchStart + idx,
          content,
          tokenCount: Math.ceil(content.length / this.CHARS_PER_TOKEN),
          embedding: embeddings[idx] ? `[${embeddings[idx]!.join(',')}]` : null,
        }));

        for (const record of chunkRecords) {
          if (record.embedding) {
            await prisma.$executeRawUnsafe(
              `INSERT INTO document_chunks (id, document_id, chunk_index, content, token_count, created_at)
               VALUES (gen_random_uuid(), $1, $2, $3, $4, now())`,
              record.documentId,
              record.chunkIndex,
              record.content,
              record.tokenCount,
            );
            await prisma.$executeRawUnsafe(
              `UPDATE document_chunks
               SET embedding = $1::vector
               WHERE document_id = $2 AND chunk_index = $3`,
              record.embedding,
              record.documentId,
              record.chunkIndex,
            );
          }
        }
      }

      await prisma.knowledgeDocument.update({
        where: { id: documentId },
        data: { status: 'INDEXED' },
      });

      this.logger.log(`Document ${documentId} indexed successfully with ${chunks.length} chunks`);
    } catch (err) {
      this.logger.error(`Failed to embed document ${documentId}: ${(err as Error).message}`);
      await prisma.knowledgeDocument.update({
        where: { id: documentId },
        data: { status: 'FAILED' },
      });
      throw err;
    }
  }

  private chunkText(text: string): string[] {
    const chunkSizeChars = CHUNK_SIZE_TOKENS * this.CHARS_PER_TOKEN;
    const overlapChars = CHUNK_OVERLAP_TOKENS * this.CHARS_PER_TOKEN;
    const chunks: string[] = [];

    let start = 0;
    while (start < text.length) {
      const end = Math.min(start + chunkSizeChars, text.length);
      const chunk = text.slice(start, end).trim();
      if (chunk.length > 0) {
        chunks.push(chunk);
      }
      if (end === text.length) break;
      start = end - overlapChars;
    }

    return chunks;
  }
}
