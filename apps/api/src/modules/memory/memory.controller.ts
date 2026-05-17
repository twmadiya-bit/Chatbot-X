import {
  Controller,
  Get,
  Delete,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MemoryService } from './memory.service';
import { prisma } from '@chatbot-x/database';

@UseGuards(JwtAuthGuard)
@Controller()
export class MemoryController {
  constructor(private readonly memoryService: MemoryService) {}

  @Get('chatbots/:chatbotId/users/:endUserId/memory')
  async getMemoryContext(
    @Param('chatbotId') chatbotId: string,
    @Param('endUserId') endUserId: string,
  ): Promise<{ context: string }> {
    const context = await this.memoryService.getMemoryContext(chatbotId, endUserId);
    return { context };
  }

  @Delete('chatbots/:chatbotId/users/:endUserId/memory')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUserMemories(
    @Param('chatbotId') chatbotId: string,
    @Param('endUserId') endUserId: string,
  ): Promise<void> {
    const profile = await prisma.endUserProfile.findUnique({
      where: { chatbotId_endUserId: { chatbotId, endUserId } },
    });

    if (!profile) {
      return;
    }

    await prisma.userMemory.deleteMany({ where: { endUserProfileId: profile.id } });
  }
}
