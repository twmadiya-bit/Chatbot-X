import { Test, TestingModule } from '@nestjs/testing';
import { ChatbotsService } from './chatbots.service';
import { AiGatewayService } from '../ai-gateway/ai-gateway.service';
import { prisma } from '@chatbot-x/database';

// ── mock the Prisma singleton ──────────────────────────────────────────────
jest.mock('@chatbot-x/database', () => ({
  prisma: {
    chatbot: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    widgetDeployment: { create: jest.fn() },
    botBranding: { update: jest.fn() },
    handoffConfig: { upsert: jest.fn() },
    aiModel: { findMany: jest.fn() },
    whatsappConfig: { upsert: jest.fn(), findUnique: jest.fn() },
  },
}));

jest.mock('nanoid', () => ({ customAlphabet: () => () => 'MOCKEDNANOID32CHARSLONG12345678' }));
jest.mock('@chatbot-x/shared', () => ({
  NotFoundError: class NotFoundError extends Error {},
  ForbiddenError: class ForbiddenError extends Error {},
  WIDGET_API_KEY_PREFIX: 'wxk_',
}));

const makeChatbot = (overrides = {}) => ({
  id: 'bot-1',
  tenantId: 'tenant-1',
  name: 'Support Bot',
  status: 'DRAFT',
  systemPrompt: 'You are helpful.',
  channel: ['WIDGET'],
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('ChatbotsService', () => {
  let service: ChatbotsService;
  let aiGateway: jest.Mocked<Pick<AiGatewayService, 'chat'>>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatbotsService,
        {
          provide: AiGatewayService,
          useValue: { chat: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(ChatbotsService);
    aiGateway = module.get(AiGatewayService);
  });

  // ── create ───────────────────────────────────────────────────────────────
  describe('create', () => {
    it('calls prisma.chatbot.create with tenantId and name', async () => {
      (prisma.chatbot.create as jest.Mock).mockResolvedValue(makeChatbot());

      await service.create('tenant-1', {
        name: 'Support Bot',
        systemPrompt: 'You are helpful.',
        channel: ['WIDGET'],
      } as never);

      expect(prisma.chatbot.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tenantId: 'tenant-1', name: 'Support Bot' }),
        }),
      );
    });

    it('generates an API key with the widget prefix', async () => {
      (prisma.chatbot.create as jest.Mock).mockResolvedValue(makeChatbot());

      await service.create('tenant-1', { name: 'Bot', systemPrompt: 'x', channel: ['WIDGET'] } as never);

      const call = (prisma.chatbot.create as jest.Mock).mock.calls[0][0];
      expect(call.data.widgetDeployment.create.apiKey).toMatch(/^wxk_/);
    });
  });

  // ── findAll ──────────────────────────────────────────────────────────────
  describe('findAll', () => {
    it("queries only the requesting tenant's chatbots", async () => {
      (prisma.chatbot.findMany as jest.Mock).mockResolvedValue([makeChatbot()]);

      const result = await service.findAll('tenant-1');

      expect(prisma.chatbot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ tenantId: 'tenant-1' }) }),
      );
      expect(result).toHaveLength(1);
    });
  });

  // ── findById ─────────────────────────────────────────────────────────────
  describe('findById', () => {
    it('returns the chatbot when found', async () => {
      const bot = makeChatbot();
      (prisma.chatbot.findUnique as jest.Mock).mockResolvedValue(bot);
      await expect(service.findById('tenant-1', 'bot-1')).resolves.toBe(bot);
    });

    it('throws when chatbot does not belong to tenant', async () => {
      (prisma.chatbot.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.findById('tenant-1', 'bot-999')).rejects.toThrow();
    });
  });

  // ── archive ──────────────────────────────────────────────────────────────
  describe('archive', () => {
    it('sets chatbot status to ARCHIVED', async () => {
      (prisma.chatbot.findUnique as jest.Mock).mockResolvedValue(makeChatbot());
      (prisma.chatbot.update as jest.Mock).mockResolvedValue(makeChatbot({ status: 'ARCHIVED' }));

      await service.archive('tenant-1', 'bot-1');

      expect(prisma.chatbot.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'ARCHIVED' } }),
      );
    });
  });

  // ── testMessage ──────────────────────────────────────────────────────────
  describe('testMessage', () => {
    it('calls aiGateway.chat and returns response with latencyMs', async () => {
      (prisma.chatbot.findUnique as jest.Mock).mockResolvedValue(
        makeChatbot({ systemPrompt: 'Be helpful.' }),
      );
      (aiGateway.chat as jest.Mock).mockResolvedValue({
        content: 'Hello!',
        inputTokens: 10,
        outputTokens: 5,
      });

      const result = await service.testMessage('tenant-1', 'bot-1', 'Hi');

      expect(aiGateway.chat).toHaveBeenCalledTimes(1);
      expect(result).toMatchObject({ response: 'Hello!', inputTokens: 10, outputTokens: 5 });
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });
  });
});
