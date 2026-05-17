import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { prisma } from '@chatbot-x/database';
import type { IntegrationProvider, TenantIntegration, SyncedProduct } from '@chatbot-x/database';

export interface ConnectIntegrationDto {
  providerId: string;
  credentials: Record<string, string>;
}

export interface InventoryResult {
  inStock: boolean;
  quantity: number | null;
  price: number | null;
}

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);

  constructor(
    @InjectQueue('integration-sync') private readonly syncQueue: Queue,
  ) {}

  async listProviders(): Promise<IntegrationProvider[]> {
    return prisma.integrationProvider.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async listConnected(
    tenantId: string,
    chatbotId?: string,
  ): Promise<TenantIntegration[]> {
    return prisma.tenantIntegration.findMany({
      where: {
        tenantId,
        ...(chatbotId ? { chatbotId } : {}),
      },
      include: { integrationProvider: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async connect(
    tenantId: string,
    chatbotId: string,
    providerId: string,
    credentials: Record<string, string>,
  ): Promise<TenantIntegration> {
    const provider = await prisma.integrationProvider.findUnique({ where: { id: providerId } });
    if (!provider) {
      throw new NotFoundException(`Integration provider ${providerId} not found`);
    }

    // TODO: Replace base64 encoding with KMS-backed encryption
    const credentialsEncrypted = Buffer.from(JSON.stringify(credentials)).toString('base64');

    const integration = await prisma.tenantIntegration.create({
      data: {
        tenantId,
        chatbotId,
        integrationProviderId: providerId,
        credentialsEncrypted,
        status: 'CONNECTED',
      },
    });

    this.logger.log(`Connected integration ${integration.id} for tenant ${tenantId}`);

    await this.triggerSync(tenantId, integration.id);

    return integration;
  }

  async disconnect(tenantId: string, integrationId: string): Promise<void> {
    const integration = await prisma.tenantIntegration.findFirst({
      where: { id: integrationId, tenantId },
    });

    if (!integration) {
      throw new NotFoundException(`Integration ${integrationId} not found`);
    }

    await prisma.syncedProduct.deleteMany({ where: { tenantIntegrationId: integrationId } });
    await prisma.tenantIntegration.update({
      where: { id: integrationId },
      data: { status: 'DISCONNECTED' },
    });

    this.logger.log(`Disconnected integration ${integrationId} and removed synced products`);
  }

  async triggerSync(tenantId: string, integrationId: string): Promise<void> {
    const integration = await prisma.tenantIntegration.findFirst({
      where: { id: integrationId, tenantId },
    });

    if (!integration) {
      throw new NotFoundException(`Integration ${integrationId} not found`);
    }

    await this.syncQueue.add(
      'sync-integration',
      { integrationId },
      { attempts: 3, backoff: { type: 'exponential', delay: 10000 } },
    );

    this.logger.log(`Queued sync job for integration ${integrationId}`);
  }

  async searchProducts(
    chatbotId: string,
    query: string,
    limit = 10,
  ): Promise<SyncedProduct[]> {
    return prisma.syncedProduct.findMany({
      where: {
        chatbotId,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: limit,
      orderBy: { lastSyncedAt: 'desc' },
    });
  }

  async getProduct(chatbotId: string, externalId: string): Promise<SyncedProduct | null> {
    const integrations = await prisma.tenantIntegration.findMany({
      where: { chatbotId, status: 'CONNECTED' },
      select: { id: true },
    });

    const integrationIds = integrations.map((i) => i.id);
    if (integrationIds.length === 0) return null;

    return prisma.syncedProduct.findFirst({
      where: {
        chatbotId,
        externalId,
        tenantIntegrationId: { in: integrationIds },
      },
    });
  }

  async checkInventory(
    chatbotId: string,
    productName: string,
  ): Promise<InventoryResult[]> {
    const products = await this.searchProducts(chatbotId, productName, 5);

    return products.map((p: SyncedProduct) => ({
      inStock: p.inStock,
      quantity: p.stockQuantity ?? null,
      price: p.price ? Number(p.price) : null,
    }));
  }
}
