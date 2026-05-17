import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { KnowledgeService, AddDocumentDto } from './knowledge.service';
import type { KnowledgeDocument } from '@chatbot-x/database';

@UseGuards(JwtAuthGuard)
@Controller()
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Get('chatbots/:chatbotId/knowledge')
  async listDocuments(
    @Param('chatbotId') chatbotId: string,
  ): Promise<KnowledgeDocument[]> {
    return this.knowledgeService.listDocuments(chatbotId);
  }

  @Post('chatbots/:chatbotId/knowledge')
  @HttpCode(HttpStatus.CREATED)
  async addDocument(
    @Param('chatbotId') chatbotId: string,
    @Body() dto: AddDocumentDto,
  ): Promise<KnowledgeDocument> {
    return this.knowledgeService.addDocument(chatbotId, dto);
  }

  @Delete('chatbots/:chatbotId/knowledge/:docId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteDocument(
    @Param('chatbotId') chatbotId: string,
    @Param('docId') docId: string,
  ): Promise<void> {
    return this.knowledgeService.deleteDocument(chatbotId, docId);
  }
}
