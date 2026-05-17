import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { prisma } from '@chatbot-x/database';

interface SyncJobData {
  integrationId: string;
}

interface ShopifyProduct {
  id: number;
  title: string;
  body_html?: string;
  variants: Array<{
    sku?: string;
    price?: string;
    inventory_quantity?: number;
  }>;
  images: Array<{ src: string }>;
  handle: string;
}

interface ShopifyProductsResponse {
  products: ShopifyProduct[];
}

@Processor('integration-sync')
export class IntegrationSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(IntegrationSyncProcessor.name);

  async process(job: Job<SyncJobData>): Promise<void> {
    const { integrationId } = job.data;
    this.logger.log(`Starting sync for integration ${integrationId}`);

    const integration = await prisma.tenantIntegration.findUnique({
      where: { id: integrationId },
      include: { integrationProvider: true },
    });

    if (!integration) {
      this.logger.warn(`Integration ${integrationId} not found, skipping`);
      return;
    }

    const syncJob = await prisma.integrationSyncJob.create({
      data: {
        tenantIntegrationId: integrationId,
        syncType: 'full',
        status: 'running',
        startedAt: new Date(),
      },
    });

    try {
      const providerKey = integration.integrationProvider.key.toLowerCase();

      if (providerKey === 'shopify') {
        await this.syncShopify(integration, syncJob.id);
      } else {
        this.logger.log(`Sync not yet implemented for ${integration.integrationProvider.key}`);
        await prisma.integrationSyncJob.update({
          where: { id: syncJob.id },
          data: { status: 'completed', recordsSynced: 0, completedAt: new Date() },
        });
      }

      await prisma.tenantIntegration.update({
        where: { id: integrationId },
        data: { lastSyncAt: new Date(), syncStatus: 'success' },
      });

      this.logger.log(`Sync completed for integration ${integrationId}`);
    } catch (err) {
      const errorMsg = (err as Error).message;
      this.logger.error(`Sync failed for integration ${integrationId}: ${errorMsg}`);

      await prisma.integrationSyncJob.update({
        where: { id: syncJob.id },
        data: { status: 'failed', error: errorMsg, completedAt: new Date() },
      });

      await prisma.tenantIntegration.update({
        where: { id: integrationId },
        data: { syncStatus: 'error' },
      });

      throw err;
    }
  }

  private async syncShopify(
    integration: Awaited<ReturnType<typeof prisma.tenantIntegration.findUnique>> & {
      integrationProvider: { key: string };
    },
    syncJobId: string,
  ): Promise<void> {
    if (!integration) return;

    const credentialsRaw = integration.credentialsEncrypted
      ? Buffer.from(integration.credentialsEncrypted, 'base64').toString('utf-8')
      : '{}';

    const credentials = JSON.parse(credentialsRaw) as Record<string, string>;
    const shop = credentials['shop'] ?? '';
    const apiKey = credentials['api_key'] ?? credentials['access_token'] ?? '';

    if (!shop || !apiKey) {
      throw new Error('Shopify integration missing shop or api_key credentials');
    }

    const url = `https://${shop}.myshopify.com/admin/api/2024-01/products.json`;
    const response = await fetch(url, {
      headers: {
        'X-Shopify-Access-Token': apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Shopify API returned ${response.status}: ${response.statusText}`);
    }

    const data = (await response.json()) as ShopifyProductsResponse;
    const products = data.products ?? [];

    let synced = 0;
    for (const product of products) {
      const firstVariant = product.variants[0];
      const chatbotId = integration.chatbotId ?? '';

      if (!chatbotId) continue;

      await prisma.syncedProduct.upsert({
        where: {
          tenantIntegrationId_externalId: {
            tenantIntegrationId: integration.id,
            externalId: String(product.id),
          },
        },
        update: {
          name: product.title,
          description: product.body_html ?? null,
          price: firstVariant?.price ? parseFloat(firstVariant.price) : null,
          currency: 'USD',
          sku: firstVariant?.sku ?? null,
          stockQuantity: firstVariant?.inventory_quantity ?? null,
          inStock: (firstVariant?.inventory_quantity ?? 1) > 0,
          imageUrl: product.images[0]?.src ?? null,
          productUrl: `https://${shop}.myshopify.com/products/${product.handle}`,
          lastSyncedAt: new Date(),
        },
        create: {
          tenantIntegrationId: integration.id,
          chatbotId,
          externalId: String(product.id),
          name: product.title,
          description: product.body_html ?? null,
          price: firstVariant?.price ? parseFloat(firstVariant.price) : null,
          currency: 'USD',
          sku: firstVariant?.sku ?? null,
          stockQuantity: firstVariant?.inventory_quantity ?? null,
          inStock: (firstVariant?.inventory_quantity ?? 1) > 0,
          imageUrl: product.images[0]?.src ?? null,
          productUrl: `https://${shop}.myshopify.com/products/${product.handle}`,
        },
      });

      synced++;
    }

    await prisma.integrationSyncJob.update({
      where: { id: syncJobId },
      data: { status: 'completed', recordsSynced: synced, completedAt: new Date() },
    });

    this.logger.log(`Shopify sync completed: ${synced} products upserted for integration ${integration.id}`);
  }
}
