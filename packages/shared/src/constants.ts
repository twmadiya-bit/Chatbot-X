export const AI_PROVIDERS = {
  ANTHROPIC: 'anthropic',
  OPENAI: 'openai',
  GOOGLE: 'google',
  MISTRAL: 'mistral',
  GROQ: 'groq',
} as const;

export const DEFAULT_MODEL = 'claude-sonnet-4-6';
export const FALLBACK_MODEL = 'gpt-4o';
export const BUDGET_MODEL = 'claude-haiku-4-5-20251001';

export const CONTEXT_WINDOW_BUFFER = 0.8;
export const MAX_CONVERSATION_TURNS = 20;
export const EMBEDDING_DIMENSIONS = 1536;
export const RAG_TOP_K = 5;
export const CHUNK_SIZE_TOKENS = 512;
export const CHUNK_OVERLAP_TOKENS = 50;

export const WIDGET_API_KEY_PREFIX = 'wxk_live_';
export const WIDGET_TEST_KEY_PREFIX = 'wxk_test_';

export const SENTIMENT_ESCALATION_THRESHOLD = 0.3;
export const CONFIDENCE_ESCALATION_THRESHOLD = 0.4;

export const BILLING = {
  USAGE_ALERT_PCT: 80,
  OVERAGE_ALERT_PCT: 100,
  DEFAULT_MARKUP_PCT: 40,
} as const;

export const CACHE_TTL = {
  BOT_CONFIG: 5 * 60,
  BRANDING: 10 * 60,
  USER_PROFILE: 2 * 60,
  SYNCED_PRODUCTS: 15 * 60,
} as const;

export const QUEUE_NAMES = {
  USAGE_AGGREGATION: 'usage-aggregation',
  BILLING: 'billing',
  WHATSAPP_INBOUND: 'whatsapp-inbound',
  WHATSAPP_OUTBOUND: 'whatsapp-outbound',
  EMBEDDING_GENERATION: 'embedding-generation',
  EMAIL_NOTIFICATION: 'email-notification',
  INTEGRATION_SYNC: 'integration-sync',
  MEMORY_EXTRACTION: 'memory-extraction',
  OUTBOUND_CAMPAIGN: 'outbound-campaign',
  SENTIMENT_ANALYSIS: 'sentiment-analysis',
} as const;

export const INDUSTRIES = {
  ECOMMERCE: 'ecommerce',
  HEALTHCARE: 'healthcare',
  REAL_ESTATE: 'real-estate',
  RESTAURANT: 'restaurant',
  EDUCATION: 'education',
  FINANCE: 'finance',
  TRAVEL: 'travel',
  AUTOMOTIVE: 'automotive',
  PROFESSIONAL_SERVICES: 'professional-services',
  FITNESS: 'fitness',
} as const;

export const FEATURES = {
  // Core
  FAQ: 'faq',
  MULTILINGUAL: 'multilingual',
  BUSINESS_HOURS: 'business_hours',
  HUMAN_HANDOFF: 'human_handoff',
  SENTIMENT_ANALYSIS: 'sentiment_analysis',
  LIVE_AGENT: 'live_agent',
  // Commerce
  PRODUCT_CATALOG: 'product_catalog',
  INVENTORY_SYNC: 'inventory_sync',
  ORDER_TRACKING: 'order_tracking',
  PRODUCT_RECOMMENDATIONS: 'product_recommendations',
  ABANDONED_CART: 'abandoned_cart',
  RETURNS_PROCESSING: 'returns_processing',
  CONVERSATIONAL_CHECKOUT: 'conversational_checkout',
  VISUAL_SEARCH: 'visual_search',
  // Booking
  APPOINTMENT_BOOKING: 'appointment_booking',
  CALENDAR_SYNC: 'calendar_sync',
  APPOINTMENT_REMINDERS: 'appointment_reminders',
  // Lead & CRM
  LEAD_CAPTURE: 'lead_capture',
  LEAD_QUALIFICATION: 'lead_qualification',
  CRM_SYNC: 'crm_sync',
  // Knowledge & AI
  KNOWLEDGE_BASE: 'knowledge_base',
  RAG_SEARCH: 'rag_search',
  DOCUMENT_AI: 'document_ai',
  MEMORY_PERSONALIZATION: 'memory_personalization',
  // Analytics
  BASIC_ANALYTICS: 'basic_analytics',
  ADVANCED_ANALYTICS: 'advanced_analytics',
  REVENUE_ATTRIBUTION: 'revenue_attribution',
  CONVERSATION_INTELLIGENCE: 'conversation_intelligence',
  // Outbound
  OUTBOUND_CAMPAIGNS: 'outbound_campaigns',
  // Channels
  WIDGET_CHANNEL: 'widget_channel',
  WHATSAPP_CHANNEL: 'whatsapp_channel',
  // Compliance
  HIPAA_MODE: 'hipaa_mode',
  PII_REDACTION: 'pii_redaction',
} as const;
