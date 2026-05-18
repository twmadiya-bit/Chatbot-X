import {
  Controller,
  Get,
  Delete,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { MemoryService } from './memory.service';
import { prisma } from '@chatbot-x/database';

@UseGuards(JwtAuthGuard)
@Controller()
export class MemoryController {
  constructor(private readonly memoryService: MemoryService) {}

  @Get('chatbots/:chatbotId/users')
  async listEndUsers(
    @CurrentTenant() tenantId: string,
    @Param('chatbotId') chatbotId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '25',
  ) {
    const chatbot = await prisma.chatbot.findFirst({ where: { id: chatbotId, tenantId } });
    if (!chatbot) return { data: [], total: 0 };

    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      prisma.endUserProfile.findMany({
        where: { chatbotId },
        orderBy: { lastSeenAt: 'desc' },
        skip,
        take: Number(limit),
        include: {
          _count: { select: { memories: true } },
        },
      }),
      prisma.endUserProfile.count({ where: { chatbotId } }),
    ]);
    return { data, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) };
  }

  @Get('chatbots/:chatbotId/users/:endUserId/memory')
  async getMemoryContext(
    @Param('chatbotId') chatbotId: string,
    @Param('endUserId') endUserId: string,
  ): Promise<{ context: string; memories: unknown[] }> {
    const [context, profile] = await Promise.all([
      this.memoryService.getMemoryContext(chatbotId, endUserId),
      prisma.endUserProfile.findUnique({
        where: { chatbotId_endUserId: { chatbotId, endUserId } },
        include: { memories: { orderBy: { createdAt: 'desc' }, take: 50 } },
      }),
    ]);
    return { context, memories: profile?.memories ?? [] };
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
    if (!profile) return;
    await prisma.userMemory.deleteMany({ where: { endUserProfileId: profile.id } });
  }
}
