import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Req,
  Res,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  RawBodyRequest,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { WhatsappService } from './whatsapp.service';

@ApiTags('whatsapp-webhooks')
@Controller('webhooks/whatsapp')
export class WhatsappWebhookController {
  private readonly logger = new Logger(WhatsappWebhookController.name);

  constructor(private readonly whatsappService: WhatsappService) {}

  @Get(':chatbotId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Meta webhook verification challenge (no JWT)' })
  async verifyWebhook(
    @Param('chatbotId') chatbotId: string,
    @Query('hub.mode') mode: string,
    @Query('hub.challenge') challenge: string,
    @Query('hub.verify_token') verifyToken: string,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.debug(`Webhook verification for chatbot ${chatbotId}, mode: ${mode}`);

    const challengeResponse = this.whatsappService.verifyWebhook(
      mode,
      challenge,
      verifyToken,
      chatbotId,
    );

    res.status(HttpStatus.OK).send(challengeResponse);
  }

  @Post(':chatbotId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Meta inbound message webhook (no JWT)' })
  async receiveInbound(
    @Param('chatbotId') chatbotId: string,
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-hub-signature-256') signature: string,
  ): Promise<{ status: string }> {
    this.logger.debug(`Inbound WhatsApp webhook for chatbot ${chatbotId}`);

    const rawBody = req.rawBody ?? Buffer.from(JSON.stringify(req.body));
    const body = req.body as Record<string, unknown>;

    await this.whatsappService.processInboundWebhook(chatbotId, rawBody, body, signature);

    return { status: 'ok' };
  }
}
