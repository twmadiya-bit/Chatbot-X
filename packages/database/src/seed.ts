import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // AI Providers
  const anthropic = await prisma.aiProvider.upsert({
    where: { key: 'anthropic' },
    update: {},
    create: { key: 'anthropic', name: 'Anthropic', isActive: true },
  });
  const openai = await prisma.aiProvider.upsert({
    where: { key: 'openai' },
    update: {},
    create: { key: 'openai', name: 'OpenAI', isActive: true },
  });
  const google = await prisma.aiProvider.upsert({
    where: { key: 'google' },
    update: {},
    create: { key: 'google', name: 'Google AI', isActive: true },
  });
  const mistral = await prisma.aiProvider.upsert({
    where: { key: 'mistral' },
    update: {},
    create: { key: 'mistral', name: 'Mistral AI', isActive: true },
  });

  // AI Models
  const models = [
    { providerId: anthropic.id, modelId: 'claude-opus-4-7', displayName: 'Claude Opus 4.7', tier: 'PREMIUM' as const, supportsVision: true, supportsToolUse: true, contextWindow: 200000 },
    { providerId: anthropic.id, modelId: 'claude-sonnet-4-6', displayName: 'Claude Sonnet 4.6', tier: 'STANDARD' as const, supportsVision: true, supportsToolUse: true, contextWindow: 200000 },
    { providerId: anthropic.id, modelId: 'claude-haiku-4-5-20251001', displayName: 'Claude Haiku 4.5', tier: 'BUDGET' as const, supportsVision: true, supportsToolUse: true, contextWindow: 200000 },
    { providerId: openai.id, modelId: 'gpt-4o', displayName: 'GPT-4o', tier: 'STANDARD' as const, supportsVision: true, supportsToolUse: true, contextWindow: 128000 },
    { providerId: openai.id, modelId: 'gpt-4o-mini', displayName: 'GPT-4o Mini', tier: 'BUDGET' as const, supportsVision: true, supportsToolUse: true, contextWindow: 128000 },
    { providerId: google.id, modelId: 'gemini-2.0-flash', displayName: 'Gemini 2.0 Flash', tier: 'BUDGET' as const, supportsVision: true, supportsToolUse: true, contextWindow: 1000000 },
    { providerId: google.id, modelId: 'gemini-2.0-pro', displayName: 'Gemini 2.0 Pro', tier: 'STANDARD' as const, supportsVision: true, supportsToolUse: true, contextWindow: 1000000 },
    { providerId: mistral.id, modelId: 'mistral-large-latest', displayName: 'Mistral Large', tier: 'STANDARD' as const, supportsVision: false, supportsToolUse: true, contextWindow: 32000 },
  ];

  for (const model of models) {
    await prisma.aiModel.upsert({
      where: { modelId: model.modelId },
      update: {},
      create: { ...model, capabilities: {}, isActive: true },
    });
  }

  // Model Pricing (illustrative, update as providers change)
  const pricingData = [
    { modelId: 'claude-opus-4-7', input: 15.0, output: 75.0 },
    { modelId: 'claude-sonnet-4-6', input: 3.0, output: 15.0 },
    { modelId: 'claude-haiku-4-5-20251001', input: 0.8, output: 4.0 },
    { modelId: 'gpt-4o', input: 2.5, output: 10.0 },
    { modelId: 'gpt-4o-mini', input: 0.15, output: 0.6 },
    { modelId: 'gemini-2.0-flash', input: 0.1, output: 0.4 },
    { modelId: 'gemini-2.0-pro', input: 1.25, output: 5.0 },
    { modelId: 'mistral-large-latest', input: 2.0, output: 6.0 },
  ];

  for (const p of pricingData) {
    const model = await prisma.aiModel.findUnique({ where: { modelId: p.modelId } });
    if (model) {
      const existing = await prisma.modelPricing.findFirst({
        where: { modelId: model.id, effectiveTo: null },
      });
      if (!existing) {
        await prisma.modelPricing.create({
          data: {
            modelId: model.id,
            inputCostPerMillion: p.input,
            outputCostPerMillion: p.output,
            effectiveFrom: new Date(),
          },
        });
      }
    }
  }

  // Feature Categories
  const categories = ['Core', 'Commerce', 'Booking', 'Lead & CRM', 'Support', 'Knowledge', 'Analytics', 'Channels'];
  const categoryMap: Record<string, string> = {};
  for (let i = 0; i < categories.length; i++) {
    const cat = await prisma.featureCategory.upsert({
      where: { id: (await prisma.featureCategory.findFirst({ where: { name: categories[i] } }))?.id ?? '00000000-0000-0000-0000-000000000000' },
      update: {},
      create: { name: categories[i], sortOrder: i },
    });
    categoryMap[categories[i]] = cat.id;
  }

  // Industries
  const industriesData = [
    { name: 'E-Commerce / Retail', slug: 'ecommerce', icon: 'shopping-cart' },
    { name: 'Healthcare / Clinics', slug: 'healthcare', icon: 'heart-pulse' },
    { name: 'Real Estate', slug: 'real-estate', icon: 'building' },
    { name: 'Restaurant / Food', slug: 'restaurant', icon: 'utensils' },
    { name: 'Education', slug: 'education', icon: 'graduation-cap' },
    { name: 'Finance / Banking', slug: 'finance', icon: 'landmark' },
    { name: 'Travel / Hospitality', slug: 'travel', icon: 'plane' },
    { name: 'Automotive', slug: 'automotive', icon: 'car' },
    { name: 'Professional Services', slug: 'professional-services', icon: 'briefcase' },
    { name: 'Fitness / Wellness', slug: 'fitness', icon: 'dumbbell' },
  ];

  for (const ind of industriesData) {
    await prisma.industry.upsert({
      where: { slug: ind.slug },
      update: {},
      create: { ...ind, isActive: true },
    });
  }

  // Integration Providers
  const integrations = [
    { key: 'shopify', name: 'Shopify', category: 'INVENTORY' as const, authType: 'OAUTH2' as const },
    { key: 'woocommerce', name: 'WooCommerce', category: 'INVENTORY' as const, authType: 'API_KEY' as const },
    { key: 'google_calendar', name: 'Google Calendar', category: 'CALENDAR' as const, authType: 'OAUTH2' as const },
    { key: 'calendly', name: 'Calendly', category: 'CALENDAR' as const, authType: 'OAUTH2' as const },
    { key: 'hubspot', name: 'HubSpot', category: 'CRM' as const, authType: 'OAUTH2' as const },
    { key: 'salesforce', name: 'Salesforce', category: 'CRM' as const, authType: 'OAUTH2' as const },
    { key: 'square', name: 'Square', category: 'POS' as const, authType: 'OAUTH2' as const },
    { key: 'stripe', name: 'Stripe', category: 'PAYMENT' as const, authType: 'API_KEY' as const },
    { key: 'zapier', name: 'Zapier', category: 'CUSTOM' as const, authType: 'WEBHOOK' as const },
    { key: 'custom_api', name: 'Custom API / Webhook', category: 'CUSTOM' as const, authType: 'WEBHOOK' as const },
  ];

  for (const integration of integrations) {
    await prisma.integrationProvider.upsert({
      where: { key: integration.key },
      update: {},
      create: { ...integration, capabilities: [], isActive: true },
    });
  }

  // Platform Settings
  const existing = await prisma.platformSettings.findFirst();
  if (!existing) {
    await prisma.platformSettings.create({
      data: { setupFeeWidget: 149, setupFeeWhatsapp: 199, setupFeeBoth: 299, defaultMarkupPct: 40 },
    });
  }

  console.log('Seeding complete.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
