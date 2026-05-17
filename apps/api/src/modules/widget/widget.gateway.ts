import { Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { WidgetService } from './widget.service';
import { UnauthorizedError } from '@chatbot-x/shared';

interface WidgetMessagePayload {
  visitorId: string;
  conversationId?: string;
  message: string;
  mediaUrl?: string;
  mediaType?: string;
}

@WebSocketGateway({
  namespace: 'widget',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})
export class WidgetGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(WidgetGateway.name);
  private readonly connectedClients = new Map<string, string>();

  constructor(private readonly widgetService: WidgetService) {}

  async handleConnection(client: Socket) {
    const apiKey =
      (client.handshake.auth as Record<string, string>)?.apiKey ??
      (client.handshake.query as Record<string, string>)?.key;

    if (!apiKey) {
      this.logger.warn(`Widget socket connection rejected — no API key: ${client.id}`);
      client.emit('error', { message: 'API key required' });
      client.disconnect(true);
      return;
    }

    try {
      await this.widgetService.validateApiKey(apiKey);
      this.connectedClients.set(client.id, apiKey);
      this.logger.log(`Widget client connected: ${client.id}`);
      client.emit('connected', { socketId: client.id });
    } catch (err) {
      const message = err instanceof UnauthorizedError ? err.message : 'Authentication failed';
      this.logger.warn(`Widget socket auth failed for ${client.id}: ${message}`);
      client.emit('error', { message });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.connectedClients.delete(client.id);
    this.logger.log(`Widget client disconnected: ${client.id}`);
  }

  @SubscribeMessage('widget:message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: WidgetMessagePayload,
  ) {
    const apiKey = this.connectedClients.get(client.id);

    if (!apiKey) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    const { visitorId, conversationId, message, mediaUrl, mediaType } = payload;

    if (!visitorId || !message) {
      client.emit('error', { message: 'visitorId and message are required' });
      return;
    }

    try {
      for await (const chunk of this.widgetService.streamMessage({
        apiKey,
        visitorId,
        conversationId,
        message,
        mediaUrl,
        mediaType,
      })) {
        client.emit('widget:response', chunk);

        if (chunk.type === 'message_done' || chunk.type === 'error') {
          break;
        }
      }
    } catch (err) {
      this.logger.error(`Widget gateway stream error for ${client.id}: ${(err as Error).message}`);
      client.emit('widget:response', {
        type: 'error',
        error: (err as Error).message ?? 'Processing failed',
      });
    }
  }
}
