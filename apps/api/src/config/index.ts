import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  port: parseInt(process.env.PORT ?? '3001', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '30d',
  encryptionKey: process.env.ENCRYPTION_KEY ?? 'dev-encryption-key-32chars!!!!!',
  corsOrigins: process.env.CORS_ORIGINS?.split(',') ?? ['http://localhost:3000'],
  widgetCdnUrl: process.env.WIDGET_CDN_URL ?? 'http://localhost:3002',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
  resendApiKey: process.env.RESEND_API_KEY ?? '',
  s3Bucket: process.env.S3_BUCKET ?? '',
  s3Region: process.env.S3_REGION ?? 'us-east-1',
}));

export const redisConfig = registerAs('redis', () => ({
  host: process.env.REDIS_HOST ?? 'localhost',
  port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  password: process.env.REDIS_PASSWORD,
}));

export const aiConfig = registerAs('ai', () => ({
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? '',
  openaiApiKey: process.env.OPENAI_API_KEY ?? '',
  googleApiKey: process.env.GOOGLE_AI_API_KEY ?? '',
  mistralApiKey: process.env.MISTRAL_API_KEY ?? '',
  groqApiKey: process.env.GROQ_API_KEY ?? '',
  voyageApiKey: process.env.VOYAGE_API_KEY ?? '',
  defaultMarkupPct: parseFloat(process.env.AI_MARKUP_PCT ?? '40'),
  defaultModel: process.env.DEFAULT_AI_MODEL ?? 'claude-sonnet-4-6',
}));
