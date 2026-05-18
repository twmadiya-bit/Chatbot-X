import {
  Controller,
  Get,
  Post,
  Body,
  Headers,
  Query,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiSecurity, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { WidgetService } from './widget.service';
import type { SendMessageDto } from '@chatbot-x/shared';

@ApiTags('Widget')
@Controller('widget/v1')
export class WidgetController {
  private readonly logger = new Logger(WidgetController.name);

  constructor(private readonly widgetService: WidgetService) {}

  @Get('config')
  @ApiOperation({ summary: 'Get widget configuration for an API key' })
  @ApiSecurity('widget-key')
  @ApiResponse({ status: 200, description: 'Widget configuration' })
  @ApiResponse({ status: 401, description: 'Invalid API key or domain not allowed' })
  async getConfig(@Query('key') apiKey: string, @Req() req: Request) {
    const origin = req.headers.origin ?? req.headers.referer ?? '';
    let domain = '';
    try {
      domain = new URL(origin).hostname;
    } catch {
      domain = origin;
    }
    return this.widgetService.getConfig(apiKey, domain);
  }

  @Post('conversation')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new conversation' })
  @ApiHeader({ name: 'X-Widget-Key', description: 'Widget API key', required: true })
  @ApiResponse({ status: 201, description: 'Conversation created' })
  @ApiResponse({ status: 401, description: 'Invalid API key' })
  async createConversation(
    @Headers('x-widget-key') apiKey: string,
    @Body() body: { visitorId: string },
  ) {
    const deployment = await this.widgetService.validateApiKey(apiKey);
    return this.widgetService.getOrCreateConversation(deployment.chatbotId, body.visitorId);
  }

  @Post('message')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a message and get a response (non-streaming)' })
  @ApiHeader({ name: 'X-Widget-Key', description: 'Widget API key', required: true })
  @ApiHeader({ name: 'X-Visitor-ID', description: 'Visitor identifier', required: true })
  @ApiResponse({ status: 200, description: 'AI response' })
  @ApiResponse({ status: 401, description: 'Invalid API key' })
  async processMessage(
    @Headers('x-widget-key') apiKey: string,
    @Headers('x-visitor-id') visitorId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.widgetService.processMessage({
      apiKey,
      visitorId,
      conversationId: dto.conversationId,
      message: dto.message,
      mediaUrl: dto.mediaUrl,
      mediaType: dto.mediaType,
    });
  }

  @Get('stream')
  @ApiOperation({ summary: 'Stream a message response as SSE (EventSource compatible)' })
  @ApiResponse({ status: 200, description: 'SSE stream of response chunks' })
  @ApiResponse({ status: 401, description: 'Invalid API key' })
  async streamMessage(
    @Query('key') apiKey: string,
    @Query('visitorId') visitorId: string,
    @Query('conversationId') conversationId: string | undefined,
    @Query('message') message: string,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    try {
      for await (const chunk of this.widgetService.streamMessage({
        apiKey,
        visitorId,
        conversationId,
        message,
      })) {
        const data = JSON.stringify(chunk);
        res.write(`data: ${data}\n\n`);

        if (chunk.type === 'message_done' || chunk.type === 'error') {
          break;
        }
      }
    } catch (err) {
      this.logger.error(`SSE stream error: ${(err as Error).message}`);
      res.write(`data: ${JSON.stringify({ type: 'error', error: (err as Error).message })}\n\n`);
    } finally {
      res.write('data: [DONE]\n\n');
      res.end();
    }
  }
}
