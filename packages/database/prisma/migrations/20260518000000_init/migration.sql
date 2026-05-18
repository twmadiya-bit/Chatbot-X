-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "public";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CreateEnum
CREATE TYPE "TenantRole" AS ENUM ('CUSTOMER', 'ADMIN');

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TenantUserRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "Channel" AS ENUM ('WIDGET', 'WHATSAPP', 'INSTAGRAM', 'MESSENGER', 'API');

-- CreateEnum
CREATE TYPE "BotStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "WidgetPosition" AS ENUM ('BOTTOM_RIGHT', 'BOTTOM_LEFT', 'TOP_RIGHT', 'TOP_LEFT');

-- CreateEnum
CREATE TYPE "WhatsappProvider" AS ENUM ('META', 'TWILIO');

-- CreateEnum
CREATE TYPE "ModelTier" AS ENUM ('BUDGET', 'STANDARD', 'PREMIUM');

-- CreateEnum
CREATE TYPE "VectorStoreProvider" AS ENUM ('PGVECTOR', 'PINECONE', 'QDRANT', 'WEAVIATE');

-- CreateEnum
CREATE TYPE "ConversationChannel" AS ENUM ('WIDGET', 'WHATSAPP', 'INSTAGRAM', 'MESSENGER', 'API');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('OPEN', 'RESOLVED', 'ESCALATED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM', 'TOOL');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'UNPAID', 'PAUSED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'REFUNDED', 'FAILED');

-- CreateEnum
CREATE TYPE "BillingStatus" AS ENUM ('PENDING', 'INVOICED', 'PAID', 'VOID');

-- CreateEnum
CREATE TYPE "DocSourceType" AS ENUM ('PDF', 'URL', 'TEXT', 'DOCX', 'FAQ');

-- CreateEnum
CREATE TYPE "DocStatus" AS ENUM ('PROCESSING', 'INDEXED', 'FAILED');

-- CreateEnum
CREATE TYPE "IntegrationCategory" AS ENUM ('INVENTORY', 'CALENDAR', 'CRM', 'POS', 'PAYMENT', 'CUSTOM', 'HEALTHCARE', 'REAL_ESTATE');

-- CreateEnum
CREATE TYPE "IntegrationAuthType" AS ENUM ('OAUTH2', 'API_KEY', 'WEBHOOK', 'BASIC');

-- CreateEnum
CREATE TYPE "IntegrationStatus" AS ENUM ('CONNECTED', 'ERROR', 'DISCONNECTED');

-- CreateEnum
CREATE TYPE "FeatureType" AS ENUM ('CAPABILITY', 'INTEGRATION', 'QUOTA', 'CHANNEL');

-- CreateEnum
CREATE TYPE "MemoryType" AS ENUM ('SESSION', 'SHORT_TERM', 'LONG_TERM', 'PROFILE');

-- CreateEnum
CREATE TYPE "TriggerType" AS ENUM ('ABANDONED_CART', 'APPOINTMENT_REMINDER', 'ORDER_SHIPPED', 'BACK_IN_STOCK', 'REENGAGEMENT', 'PAYMENT_DUE', 'CUSTOM_WEBHOOK', 'SCHEDULED');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SendStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'FAILED', 'OPTED_OUT');

-- CreateTable
CREATE TABLE "platform_settings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "setupFeeWidget" DECIMAL(10,2) NOT NULL DEFAULT 149.00,
    "setupFeeWhatsapp" DECIMAL(10,2) NOT NULL DEFAULT 199.00,
    "setupFeeBoth" DECIMAL(10,2) NOT NULL DEFAULT 299.00,
    "defaultMarkupPct" DECIMAL(5,2) NOT NULL DEFAULT 40.00,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(50),
    "passwordHash" VARCHAR(255) NOT NULL,
    "role" "TenantRole" NOT NULL DEFAULT 'CUSTOMER',
    "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
    "stripeCustomerId" VARCHAR(100),
    "timezone" VARCHAR(100) NOT NULL DEFAULT 'UTC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "role" "TenantUserRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "industries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "icon" VARCHAR(100),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "industries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bot_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "industryId" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "systemPrompt" TEXT NOT NULL,
    "defaultConfig" JSONB NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bot_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feature_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "features" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "categoryId" UUID NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "featureType" "FeatureType" NOT NULL DEFAULT 'CAPABILITY',
    "requiresIntegration" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "industry_features" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "industryId" UUID NOT NULL,
    "featureId" UUID NOT NULL,
    "isCore" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "industry_features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "industry_plans" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "industryId" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "tier" INTEGER NOT NULL,
    "stripePriceId" VARCHAR(100),
    "setupFeeUsd" DECIMAL(10,2) NOT NULL,
    "priceMonthlyUsd" DECIMAL(10,2) NOT NULL,
    "maxChatbots" INTEGER NOT NULL DEFAULT 1,
    "maxMonthlyMessages" INTEGER NOT NULL DEFAULT 1000,
    "maxKbDocs" INTEGER NOT NULL DEFAULT 10,
    "maxIntegrations" INTEGER NOT NULL DEFAULT 1,
    "includedAiCreditUsd" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "overageRatePerMsg" DECIMAL(8,4) NOT NULL DEFAULT 0.01,
    "channels" "Channel"[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "industry_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_features" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "industryPlanId" UUID NOT NULL,
    "featureId" UUID NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "plan_features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chatbots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "industryId" UUID,
    "industryPlanId" UUID,
    "botTemplateId" UUID,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "channel" "Channel"[],
    "status" "BotStatus" NOT NULL DEFAULT 'DRAFT',
    "aiModelId" UUID,
    "systemPrompt" TEXT NOT NULL,
    "maxTokens" INTEGER NOT NULL DEFAULT 1024,
    "temperature" DECIMAL(3,2) NOT NULL DEFAULT 0.7,
    "config" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chatbots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bot_branding" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "chatbotId" UUID NOT NULL,
    "primaryColor" VARCHAR(7) NOT NULL DEFAULT '#6366F1',
    "secondaryColor" VARCHAR(7) NOT NULL DEFAULT '#FFFFFF',
    "backgroundColor" VARCHAR(7) NOT NULL DEFAULT '#F9FAFB',
    "textColor" VARCHAR(7) NOT NULL DEFAULT '#111827',
    "userBubbleColor" VARCHAR(7) NOT NULL DEFAULT '#6366F1',
    "botBubbleColor" VARCHAR(7) NOT NULL DEFAULT '#F3F4F6',
    "fontFamily" VARCHAR(100) NOT NULL DEFAULT 'Inter',
    "borderRadius" INTEGER NOT NULL DEFAULT 16,
    "logoUrl" VARCHAR(500),
    "avatarUrl" VARCHAR(500),
    "position" "WidgetPosition" NOT NULL DEFAULT 'BOTTOM_RIGHT',
    "launcherText" VARCHAR(100) NOT NULL DEFAULT 'Chat with us',
    "headerTitle" VARCHAR(100),
    "headerSubtitle" VARCHAR(200),
    "welcomeScreenEnabled" BOOLEAN NOT NULL DEFAULT true,
    "welcomeMessage" TEXT NOT NULL DEFAULT 'Hello! How can I help you today?',
    "placeholderText" VARCHAR(200) NOT NULL DEFAULT 'Type a message...',
    "widgetWidth" INTEGER NOT NULL DEFAULT 380,
    "widgetHeight" INTEGER NOT NULL DEFAULT 600,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bot_branding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "handoff_configs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "chatbotId" UUID NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "handoffEmail" VARCHAR(255),
    "handoffWebhookUrl" VARCHAR(500),
    "triggerKeywords" TEXT[],
    "maxUnansweredTurns" INTEGER NOT NULL DEFAULT 3,
    "sentimentThreshold" DECIMAL(3,2) NOT NULL DEFAULT 0.3,
    "confidenceThreshold" DECIMAL(3,2) NOT NULL DEFAULT 0.4,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "handoff_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_configs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "chatbotId" UUID NOT NULL,
    "provider" "WhatsappProvider" NOT NULL DEFAULT 'META',
    "phoneNumberId" VARCHAR(100),
    "wabaId" VARCHAR(100),
    "accessTokenEncrypted" TEXT,
    "webhookVerifyToken" VARCHAR(255),
    "twilioAccountSid" VARCHAR(100),
    "twilioAuthTokenEnc" TEXT,
    "twilioWhatsappNumber" VARCHAR(50),
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "widget_deployments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "chatbotId" UUID NOT NULL,
    "apiKey" VARCHAR(64) NOT NULL,
    "allowedDomains" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "widget_deployments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_providers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_models" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "providerId" UUID NOT NULL,
    "modelId" VARCHAR(100) NOT NULL,
    "displayName" VARCHAR(255) NOT NULL,
    "capabilities" JSONB NOT NULL DEFAULT '{}',
    "contextWindow" INTEGER NOT NULL DEFAULT 200000,
    "supportsVision" BOOLEAN NOT NULL DEFAULT false,
    "supportsToolUse" BOOLEAN NOT NULL DEFAULT false,
    "supportsStreaming" BOOLEAN NOT NULL DEFAULT true,
    "tier" "ModelTier" NOT NULL DEFAULT 'STANDARD',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model_pricing" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "modelId" UUID NOT NULL,
    "inputCostPerMillion" DECIMAL(10,4) NOT NULL,
    "outputCostPerMillion" DECIMAL(10,4) NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "model_pricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vector_store_configs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID,
    "provider" "VectorStoreProvider" NOT NULL DEFAULT 'PGVECTOR',
    "configEncrypted" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vector_store_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "chatbotId" UUID NOT NULL,
    "channel" "ConversationChannel" NOT NULL,
    "endUserId" VARCHAR(255),
    "endUserName" VARCHAR(255),
    "endUserPhone" VARCHAR(50),
    "endUserEmail" VARCHAR(255),
    "sessionId" VARCHAR(255),
    "status" "ConversationStatus" NOT NULL DEFAULT 'OPEN',
    "sentiment" DECIMAL(4,3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "conversationId" UUID NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "mediaUrl" VARCHAR(500),
    "mediaType" VARCHAR(50),
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "latencyMs" INTEGER,
    "aiModelId" UUID,
    "confidenceScore" DECIMAL(4,3),
    "sentimentScore" DECIMAL(4,3),
    "whatsappMessageId" VARCHAR(255),
    "isEscalated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chatbot_subscriptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "chatbotId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "industryPlanId" UUID NOT NULL,
    "stripeSubscriptionId" VARCHAR(100),
    "stripePaymentMethodId" VARCHAR(100),
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "trialEnd" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chatbot_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "setup_fee_payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "chatbotId" UUID NOT NULL,
    "stripePaymentIntentId" VARCHAR(100),
    "amountUsd" DECIMAL(10,2) NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "setup_fee_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_hourly" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "chatbotId" UUID NOT NULL,
    "hour" TIMESTAMP(3) NOT NULL,
    "inputTokens" BIGINT NOT NULL DEFAULT 0,
    "outputTokens" BIGINT NOT NULL DEFAULT 0,
    "totalTokens" BIGINT NOT NULL DEFAULT 0,
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "conversationCount" INTEGER NOT NULL DEFAULT 0,
    "rawCostUsd" DECIMAL(12,6) NOT NULL DEFAULT 0,
    "billedCostUsd" DECIMAL(12,6) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_hourly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_monthly" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "billingPeriodStart" TIMESTAMP(3) NOT NULL,
    "billingPeriodEnd" TIMESTAMP(3) NOT NULL,
    "totalInputTokens" BIGINT NOT NULL DEFAULT 0,
    "totalOutputTokens" BIGINT NOT NULL DEFAULT 0,
    "totalTokens" BIGINT NOT NULL DEFAULT 0,
    "totalMessages" INTEGER NOT NULL DEFAULT 0,
    "totalConversations" INTEGER NOT NULL DEFAULT 0,
    "rawCostUsd" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "billedCostUsd" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "includedCreditUsd" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "overageUsd" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "stripeInvoiceId" VARCHAR(100),
    "status" "BillingStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usage_monthly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_bases" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "chatbotId" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_bases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_documents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "knowledgeBaseId" UUID NOT NULL,
    "title" VARCHAR(500),
    "sourceType" "DocSourceType" NOT NULL,
    "sourceUrl" VARCHAR(1000),
    "fileUrl" VARCHAR(1000),
    "content" TEXT,
    "status" "DocStatus" NOT NULL DEFAULT 'PROCESSING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_chunks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "documentId" UUID NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "tokenCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_providers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "category" "IntegrationCategory" NOT NULL,
    "authType" "IntegrationAuthType" NOT NULL,
    "capabilities" JSONB NOT NULL DEFAULT '[]',
    "logoUrl" VARCHAR(500),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integration_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_integrations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "chatbotId" UUID,
    "integrationProviderId" UUID NOT NULL,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "credentialsEncrypted" TEXT,
    "oauthAccessTokenEnc" TEXT,
    "oauthRefreshTokenEnc" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "config" JSONB NOT NULL DEFAULT '{}',
    "lastSyncAt" TIMESTAMP(3),
    "syncStatus" VARCHAR(50),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_sync_jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantIntegrationId" UUID NOT NULL,
    "syncType" VARCHAR(50) NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "recordsSynced" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "integration_sync_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "synced_products" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantIntegrationId" UUID NOT NULL,
    "chatbotId" UUID NOT NULL,
    "externalId" VARCHAR(255) NOT NULL,
    "sku" VARCHAR(255),
    "name" VARCHAR(500) NOT NULL,
    "description" TEXT,
    "price" DECIMAL(12,4),
    "currency" VARCHAR(10),
    "stockQuantity" INTEGER,
    "inStock" BOOLEAN NOT NULL DEFAULT true,
    "attributes" JSONB NOT NULL DEFAULT '{}',
    "imageUrl" VARCHAR(500),
    "productUrl" VARCHAR(500),
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "synced_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tool_invocations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "messageId" UUID NOT NULL,
    "toolKey" VARCHAR(100) NOT NULL,
    "input" JSONB NOT NULL DEFAULT '{}',
    "output" JSONB,
    "latencyMs" INTEGER,
    "status" VARCHAR(50) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tool_invocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "end_user_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "chatbotId" UUID NOT NULL,
    "endUserId" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255),
    "phone" VARCHAR(50),
    "email" VARCHAR(255),
    "language" VARCHAR(10),
    "attributes" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "end_user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_memories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "endUserProfileId" UUID NOT NULL,
    "memoryType" "MemoryType" NOT NULL DEFAULT 'SHORT_TERM',
    "topic" VARCHAR(100) NOT NULL,
    "content" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_memories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbound_campaigns" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "chatbotId" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "triggerType" "TriggerType" NOT NULL,
    "triggerConfig" JSONB NOT NULL DEFAULT '{}',
    "messageTemplate" TEXT NOT NULL,
    "channel" "Channel"[],
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledAt" TIMESTAMP(3),
    "lastRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outbound_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_sends" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "campaignId" UUID NOT NULL,
    "endUserId" VARCHAR(255) NOT NULL,
    "endUserPhone" VARCHAR(50),
    "status" "SendStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_sends_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID,
    "actorUserId" UUID,
    "action" VARCHAR(100) NOT NULL,
    "resourceType" VARCHAR(100),
    "resourceId" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "ipAddress" VARCHAR(45),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "usageAlertThresholdPct" INTEGER NOT NULL DEFAULT 80,
    "billingEmails" BOOLEAN NOT NULL DEFAULT true,
    "usageReportEmails" BOOLEAN NOT NULL DEFAULT true,
    "handoffEmails" BOOLEAN NOT NULL DEFAULT true,
    "sentimentAlertEmails" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_email_key" ON "tenants"("email");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_stripeCustomerId_key" ON "tenants"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_users_tenantId_email_key" ON "tenant_users"("tenantId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "industries_slug_key" ON "industries"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "features_key_key" ON "features"("key");

-- CreateIndex
CREATE UNIQUE INDEX "industry_features_industryId_featureId_key" ON "industry_features"("industryId", "featureId");

-- CreateIndex
CREATE UNIQUE INDEX "industry_plans_industryId_tier_key" ON "industry_plans"("industryId", "tier");

-- CreateIndex
CREATE UNIQUE INDEX "plan_features_industryPlanId_featureId_key" ON "plan_features"("industryPlanId", "featureId");

-- CreateIndex
CREATE UNIQUE INDEX "bot_branding_chatbotId_key" ON "bot_branding"("chatbotId");

-- CreateIndex
CREATE UNIQUE INDEX "handoff_configs_chatbotId_key" ON "handoff_configs"("chatbotId");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_configs_chatbotId_key" ON "whatsapp_configs"("chatbotId");

-- CreateIndex
CREATE UNIQUE INDEX "widget_deployments_chatbotId_key" ON "widget_deployments"("chatbotId");

-- CreateIndex
CREATE UNIQUE INDEX "widget_deployments_apiKey_key" ON "widget_deployments"("apiKey");

-- CreateIndex
CREATE UNIQUE INDEX "ai_providers_key_key" ON "ai_providers"("key");

-- CreateIndex
CREATE UNIQUE INDEX "ai_models_modelId_key" ON "ai_models"("modelId");

-- CreateIndex
CREATE INDEX "conversations_chatbotId_idx" ON "conversations"("chatbotId");

-- CreateIndex
CREATE INDEX "conversations_endUserId_idx" ON "conversations"("endUserId");

-- CreateIndex
CREATE INDEX "conversations_createdAt_idx" ON "conversations"("createdAt");

-- CreateIndex
CREATE INDEX "messages_conversationId_idx" ON "messages"("conversationId");

-- CreateIndex
CREATE INDEX "messages_createdAt_idx" ON "messages"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "chatbot_subscriptions_chatbotId_key" ON "chatbot_subscriptions"("chatbotId");

-- CreateIndex
CREATE UNIQUE INDEX "chatbot_subscriptions_stripeSubscriptionId_key" ON "chatbot_subscriptions"("stripeSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "setup_fee_payments_chatbotId_key" ON "setup_fee_payments"("chatbotId");

-- CreateIndex
CREATE UNIQUE INDEX "setup_fee_payments_stripePaymentIntentId_key" ON "setup_fee_payments"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "usage_hourly_tenantId_hour_idx" ON "usage_hourly"("tenantId", "hour");

-- CreateIndex
CREATE UNIQUE INDEX "usage_hourly_tenantId_chatbotId_hour_key" ON "usage_hourly"("tenantId", "chatbotId", "hour");

-- CreateIndex
CREATE UNIQUE INDEX "usage_monthly_tenantId_billingPeriodStart_key" ON "usage_monthly"("tenantId", "billingPeriodStart");

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_bases_chatbotId_key" ON "knowledge_bases"("chatbotId");

-- CreateIndex
CREATE INDEX "knowledge_documents_knowledgeBaseId_idx" ON "knowledge_documents"("knowledgeBaseId");

-- CreateIndex
CREATE INDEX "document_chunks_documentId_idx" ON "document_chunks"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "integration_providers_key_key" ON "integration_providers"("key");

-- CreateIndex
CREATE INDEX "synced_products_chatbotId_idx" ON "synced_products"("chatbotId");

-- CreateIndex
CREATE UNIQUE INDEX "synced_products_tenantIntegrationId_externalId_key" ON "synced_products"("tenantIntegrationId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "end_user_profiles_chatbotId_endUserId_key" ON "end_user_profiles"("chatbotId", "endUserId");

-- CreateIndex
CREATE INDEX "user_memories_endUserProfileId_idx" ON "user_memories"("endUserProfileId");

-- CreateIndex
CREATE INDEX "audit_logs_tenantId_createdAt_idx" ON "audit_logs"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_tenantId_key" ON "notification_preferences"("tenantId");

-- AddForeignKey
ALTER TABLE "tenant_users" ADD CONSTRAINT "tenant_users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bot_templates" ADD CONSTRAINT "bot_templates_industryId_fkey" FOREIGN KEY ("industryId") REFERENCES "industries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "features" ADD CONSTRAINT "features_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "feature_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "industry_features" ADD CONSTRAINT "industry_features_industryId_fkey" FOREIGN KEY ("industryId") REFERENCES "industries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "industry_features" ADD CONSTRAINT "industry_features_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "features"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "industry_plans" ADD CONSTRAINT "industry_plans_industryId_fkey" FOREIGN KEY ("industryId") REFERENCES "industries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_features" ADD CONSTRAINT "plan_features_industryPlanId_fkey" FOREIGN KEY ("industryPlanId") REFERENCES "industry_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_features" ADD CONSTRAINT "plan_features_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "features"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chatbots" ADD CONSTRAINT "chatbots_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chatbots" ADD CONSTRAINT "chatbots_industryId_fkey" FOREIGN KEY ("industryId") REFERENCES "industries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chatbots" ADD CONSTRAINT "chatbots_industryPlanId_fkey" FOREIGN KEY ("industryPlanId") REFERENCES "industry_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chatbots" ADD CONSTRAINT "chatbots_botTemplateId_fkey" FOREIGN KEY ("botTemplateId") REFERENCES "bot_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chatbots" ADD CONSTRAINT "chatbots_aiModelId_fkey" FOREIGN KEY ("aiModelId") REFERENCES "ai_models"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bot_branding" ADD CONSTRAINT "bot_branding_chatbotId_fkey" FOREIGN KEY ("chatbotId") REFERENCES "chatbots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "handoff_configs" ADD CONSTRAINT "handoff_configs_chatbotId_fkey" FOREIGN KEY ("chatbotId") REFERENCES "chatbots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_configs" ADD CONSTRAINT "whatsapp_configs_chatbotId_fkey" FOREIGN KEY ("chatbotId") REFERENCES "chatbots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "widget_deployments" ADD CONSTRAINT "widget_deployments_chatbotId_fkey" FOREIGN KEY ("chatbotId") REFERENCES "chatbots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_models" ADD CONSTRAINT "ai_models_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ai_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model_pricing" ADD CONSTRAINT "model_pricing_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "ai_models"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vector_store_configs" ADD CONSTRAINT "vector_store_configs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_chatbotId_fkey" FOREIGN KEY ("chatbotId") REFERENCES "chatbots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_aiModelId_fkey" FOREIGN KEY ("aiModelId") REFERENCES "ai_models"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chatbot_subscriptions" ADD CONSTRAINT "chatbot_subscriptions_chatbotId_fkey" FOREIGN KEY ("chatbotId") REFERENCES "chatbots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chatbot_subscriptions" ADD CONSTRAINT "chatbot_subscriptions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chatbot_subscriptions" ADD CONSTRAINT "chatbot_subscriptions_industryPlanId_fkey" FOREIGN KEY ("industryPlanId") REFERENCES "industry_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "setup_fee_payments" ADD CONSTRAINT "setup_fee_payments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "setup_fee_payments" ADD CONSTRAINT "setup_fee_payments_chatbotId_fkey" FOREIGN KEY ("chatbotId") REFERENCES "chatbots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_hourly" ADD CONSTRAINT "usage_hourly_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_monthly" ADD CONSTRAINT "usage_monthly_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_bases" ADD CONSTRAINT "knowledge_bases_chatbotId_fkey" FOREIGN KEY ("chatbotId") REFERENCES "chatbots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_documents" ADD CONSTRAINT "knowledge_documents_knowledgeBaseId_fkey" FOREIGN KEY ("knowledgeBaseId") REFERENCES "knowledge_bases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "knowledge_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_integrations" ADD CONSTRAINT "tenant_integrations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_integrations" ADD CONSTRAINT "tenant_integrations_chatbotId_fkey" FOREIGN KEY ("chatbotId") REFERENCES "chatbots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_integrations" ADD CONSTRAINT "tenant_integrations_integrationProviderId_fkey" FOREIGN KEY ("integrationProviderId") REFERENCES "integration_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_sync_jobs" ADD CONSTRAINT "integration_sync_jobs_tenantIntegrationId_fkey" FOREIGN KEY ("tenantIntegrationId") REFERENCES "tenant_integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "synced_products" ADD CONSTRAINT "synced_products_tenantIntegrationId_fkey" FOREIGN KEY ("tenantIntegrationId") REFERENCES "tenant_integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_invocations" ADD CONSTRAINT "tool_invocations_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "end_user_profiles" ADD CONSTRAINT "end_user_profiles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "end_user_profiles" ADD CONSTRAINT "end_user_profiles_chatbotId_fkey" FOREIGN KEY ("chatbotId") REFERENCES "chatbots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_memories" ADD CONSTRAINT "user_memories_endUserProfileId_fkey" FOREIGN KEY ("endUserProfileId") REFERENCES "end_user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outbound_campaigns" ADD CONSTRAINT "outbound_campaigns_chatbotId_fkey" FOREIGN KEY ("chatbotId") REFERENCES "chatbots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_sends" ADD CONSTRAINT "campaign_sends_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "outbound_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "tenant_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

