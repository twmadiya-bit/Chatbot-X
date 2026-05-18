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

  // Industry Plans — per-industry tiered products
  const ecommerce = await prisma.industry.findUnique({ where: { slug: 'ecommerce' } });
  const healthcare = await prisma.industry.findUnique({ where: { slug: 'healthcare' } });
  const realEstate = await prisma.industry.findUnique({ where: { slug: 'real-estate' } });
  const restaurant = await prisma.industry.findUnique({ where: { slug: 'restaurant' } });
  const education = await prisma.industry.findUnique({ where: { slug: 'education' } });
  const finance = await prisma.industry.findUnique({ where: { slug: 'finance' } });

  if (ecommerce) {
    const plans = [
      { name: 'Retail Starter', tier: 1, setupFeeUsd: 129, priceMonthlyUsd: 39, maxMonthlyMessages: 1000, includedAiCreditUsd: 8, maxIntegrations: 1, channels: ['WIDGET'] as ('WIDGET')[] },
      { name: 'Retail Pro', tier: 2, setupFeeUsd: 249, priceMonthlyUsd: 99, maxMonthlyMessages: 8000, includedAiCreditUsd: 30, maxIntegrations: 3, channels: ['WIDGET', 'WHATSAPP'] as ('WIDGET' | 'WHATSAPP')[] },
      { name: 'Retail Enterprise', tier: 3, setupFeeUsd: 499, priceMonthlyUsd: 249, maxMonthlyMessages: 30000, includedAiCreditUsd: 100, maxIntegrations: 10, channels: ['WIDGET', 'WHATSAPP'] as ('WIDGET' | 'WHATSAPP')[] },
    ];
    for (const plan of plans) {
      const existing = await prisma.industryPlan.findFirst({ where: { industryId: ecommerce.id, tier: plan.tier } });
      if (!existing) {
        await prisma.industryPlan.create({ data: { ...plan, industryId: ecommerce.id, maxChatbots: plan.tier, maxKbDocs: plan.tier * 10, overageRatePerMsg: 0.01 } });
      }
    }
  }

  if (healthcare) {
    const plans = [
      { name: 'Clinic Starter', tier: 1, setupFeeUsd: 149, priceMonthlyUsd: 49, maxMonthlyMessages: 500, includedAiCreditUsd: 10, maxIntegrations: 1, channels: ['WIDGET'] as ('WIDGET')[] },
      { name: 'Clinic Pro', tier: 2, setupFeeUsd: 299, priceMonthlyUsd: 119, maxMonthlyMessages: 5000, includedAiCreditUsd: 40, maxIntegrations: 3, channels: ['WIDGET', 'WHATSAPP'] as ('WIDGET' | 'WHATSAPP')[] },
      { name: 'Clinic Enterprise', tier: 3, setupFeeUsd: 599, priceMonthlyUsd: 299, maxMonthlyMessages: 20000, includedAiCreditUsd: 120, maxIntegrations: 10, channels: ['WIDGET', 'WHATSAPP'] as ('WIDGET' | 'WHATSAPP')[] },
    ];
    for (const plan of plans) {
      const existing = await prisma.industryPlan.findFirst({ where: { industryId: healthcare.id, tier: plan.tier } });
      if (!existing) {
        await prisma.industryPlan.create({ data: { ...plan, industryId: healthcare.id, maxChatbots: plan.tier, maxKbDocs: plan.tier * 15, overageRatePerMsg: 0.012 } });
      }
    }
  }

  if (realEstate) {
    const plans = [
      { name: 'Agent Starter', tier: 1, setupFeeUsd: 99, priceMonthlyUsd: 29, maxMonthlyMessages: 500, includedAiCreditUsd: 6, maxIntegrations: 1, channels: ['WIDGET'] as ('WIDGET')[] },
      { name: 'Agent Pro', tier: 2, setupFeeUsd: 199, priceMonthlyUsd: 79, maxMonthlyMessages: 4000, includedAiCreditUsd: 25, maxIntegrations: 3, channels: ['WIDGET', 'WHATSAPP'] as ('WIDGET' | 'WHATSAPP')[] },
      { name: 'Agency Enterprise', tier: 3, setupFeeUsd: 399, priceMonthlyUsd: 199, maxMonthlyMessages: 15000, includedAiCreditUsd: 80, maxIntegrations: 10, channels: ['WIDGET', 'WHATSAPP'] as ('WIDGET' | 'WHATSAPP')[] },
    ];
    for (const plan of plans) {
      const existing = await prisma.industryPlan.findFirst({ where: { industryId: realEstate.id, tier: plan.tier } });
      if (!existing) {
        await prisma.industryPlan.create({ data: { ...plan, industryId: realEstate.id, maxChatbots: plan.tier, maxKbDocs: plan.tier * 10, overageRatePerMsg: 0.01 } });
      }
    }
  }

  if (restaurant) {
    const plans = [
      { name: 'Restaurant Starter', tier: 1, setupFeeUsd: 99, priceMonthlyUsd: 29, maxMonthlyMessages: 1000, includedAiCreditUsd: 8, maxIntegrations: 1, channels: ['WIDGET'] as ('WIDGET')[] },
      { name: 'Restaurant Pro', tier: 2, setupFeeUsd: 199, priceMonthlyUsd: 69, maxMonthlyMessages: 6000, includedAiCreditUsd: 22, maxIntegrations: 2, channels: ['WIDGET', 'WHATSAPP'] as ('WIDGET' | 'WHATSAPP')[] },
      { name: 'Restaurant Chain', tier: 3, setupFeeUsd: 399, priceMonthlyUsd: 179, maxMonthlyMessages: 25000, includedAiCreditUsd: 80, maxIntegrations: 8, channels: ['WIDGET', 'WHATSAPP'] as ('WIDGET' | 'WHATSAPP')[] },
    ];
    for (const plan of plans) {
      const existing = await prisma.industryPlan.findFirst({ where: { industryId: restaurant.id, tier: plan.tier } });
      if (!existing) {
        await prisma.industryPlan.create({ data: { ...plan, industryId: restaurant.id, maxChatbots: plan.tier, maxKbDocs: plan.tier * 5, overageRatePerMsg: 0.009 } });
      }
    }
  }

  if (finance) {
    const plans = [
      { name: 'Finance Starter', tier: 1, setupFeeUsd: 199, priceMonthlyUsd: 59, maxMonthlyMessages: 500, includedAiCreditUsd: 12, maxIntegrations: 1, channels: ['WIDGET'] as ('WIDGET')[] },
      { name: 'Finance Pro', tier: 2, setupFeeUsd: 399, priceMonthlyUsd: 149, maxMonthlyMessages: 5000, includedAiCreditUsd: 50, maxIntegrations: 3, channels: ['WIDGET', 'WHATSAPP'] as ('WIDGET' | 'WHATSAPP')[] },
      { name: 'Finance Enterprise', tier: 3, setupFeeUsd: 799, priceMonthlyUsd: 399, maxMonthlyMessages: 20000, includedAiCreditUsd: 150, maxIntegrations: 10, channels: ['WIDGET', 'WHATSAPP'] as ('WIDGET' | 'WHATSAPP')[] },
    ];
    for (const plan of plans) {
      const existing = await prisma.industryPlan.findFirst({ where: { industryId: finance.id, tier: plan.tier } });
      if (!existing) {
        await prisma.industryPlan.create({ data: { ...plan, industryId: finance.id, maxChatbots: plan.tier, maxKbDocs: plan.tier * 20, overageRatePerMsg: 0.015 } });
      }
    }
  }

  // Bot Templates
  const templates = [
    { slug: 'ecommerce', name: 'E-Commerce Assistant', systemPrompt: 'You are a helpful shopping assistant for an online store. Help customers find products, check availability, track orders, and answer questions about shipping and returns. Always be friendly, concise, and focus on helping customers complete their purchase. If asked about something outside shopping and products, politely redirect.' },
    { slug: 'healthcare', name: 'Healthcare Assistant', systemPrompt: 'You are a helpful healthcare assistant for a medical clinic. Help patients with appointment booking, clinic information, general health FAQs, and directing them to appropriate services. Always include a disclaimer that you are not a medical professional and that urgent medical concerns should contact emergency services. Be empathetic and professional.' },
    { slug: 'real-estate', name: 'Real Estate Assistant', systemPrompt: 'You are a knowledgeable real estate assistant. Help clients find properties matching their criteria, schedule viewings, understand the buying/renting process, and answer questions about listings. Collect lead information naturally during conversation and offer to connect them with an agent for detailed inquiries.' },
    { slug: 'restaurant', name: 'Restaurant Assistant', systemPrompt: 'You are a friendly restaurant assistant. Help customers with menu questions, dietary and allergen information, table reservations, and ordering information. Be warm and enthusiastic about the food. Highlight daily specials and promotions when relevant.' },
    { slug: 'finance', name: 'Financial Services Assistant', systemPrompt: 'You are a professional financial services assistant. Help clients with account inquiries, product information, loan and investment questions, and appointment scheduling. Always remind clients that specific financial advice should come from a qualified advisor. Maintain strict confidentiality and professionalism at all times.' },
  ];

  for (const t of templates) {
    const industry = await prisma.industry.findUnique({ where: { slug: t.slug } });
    if (industry) {
      const existingTemplate = await prisma.botTemplate.findFirst({ where: { industryId: industry.id, name: t.name } });
      if (!existingTemplate) {
        await prisma.botTemplate.create({ data: { industryId: industry.id, name: t.name, systemPrompt: t.systemPrompt, defaultConfig: {}, isActive: true } });
      }
    }
  }

  console.log('Seeding complete.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
