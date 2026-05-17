import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly openai: OpenAI;
  private readonly model = 'text-embedding-ada-002';

  constructor(private readonly config: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.config.get<string>('ai.openaiApiKey'),
    });
  }

  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    const response = await this.openai.embeddings.create({
      model: this.model,
      input: texts,
    });

    return response.data
      .sort((a, b) => a.index - b.index)
      .map((item) => item.embedding);
  }

  async embedSingle(text: string): Promise<number[]> {
    const results = await this.embed([text]);
    return results[0] ?? [];
  }

  cosineSimilarity(a: number[], b: number[]): number {
    const dot = a.reduce((sum, val, i) => sum + val * (b[i] ?? 0), 0);
    const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return magA && magB ? dot / (magA * magB) : 0;
  }
}
