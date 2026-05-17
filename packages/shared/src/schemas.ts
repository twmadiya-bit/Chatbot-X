import { z } from 'zod';

export const RegisterTenantSchema = z.object({
  name: z.string().min(2).max(255),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  phone: z.string().optional(),
  timezone: z.string().default('UTC'),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const CreateChatbotSchema = z.object({
  name: z.string().min(2).max(255),
  description: z.string().optional(),
  industryId: z.string().uuid().optional(),
  industryPlanId: z.string().uuid().optional(),
  botTemplateId: z.string().uuid().optional(),
  channel: z.array(z.enum(['WIDGET', 'WHATSAPP', 'INSTAGRAM', 'MESSENGER', 'API'])),
  systemPrompt: z.string().min(10),
  aiModelId: z.string().uuid().optional(),
  maxTokens: z.number().int().min(256).max(8192).default(1024),
  temperature: z.number().min(0).max(1).default(0.7),
  config: z.record(z.unknown()).default({}),
});

export const UpdateBrandingSchema = z.object({
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  textColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  userBubbleColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  botBubbleColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  fontFamily: z.string().max(100).optional(),
  borderRadius: z.number().int().min(0).max(32).optional(),
  position: z.enum(['BOTTOM_RIGHT', 'BOTTOM_LEFT', 'TOP_RIGHT', 'TOP_LEFT']).optional(),
  launcherText: z.string().max(100).optional(),
  headerTitle: z.string().max(100).optional(),
  headerSubtitle: z.string().max(200).optional(),
  welcomeMessage: z.string().optional(),
  placeholderText: z.string().max(200).optional(),
  widgetWidth: z.number().int().min(300).max(600).optional(),
  widgetHeight: z.number().int().min(400).max(900).optional(),
});

export const SendMessageSchema = z.object({
  conversationId: z.string().uuid().optional(),
  message: z.string().min(1).max(4000),
  visitorId: z.string().min(1),
  mediaUrl: z.string().url().optional(),
  mediaType: z.string().optional(),
});

export const CreateCampaignSchema = z.object({
  name: z.string().min(2).max(255),
  triggerType: z.enum(['ABANDONED_CART', 'APPOINTMENT_REMINDER', 'ORDER_SHIPPED', 'BACK_IN_STOCK', 'REENGAGEMENT', 'PAYMENT_DUE', 'CUSTOM_WEBHOOK', 'SCHEDULED']),
  triggerConfig: z.record(z.unknown()).default({}),
  messageTemplate: z.string().min(10),
  channel: z.array(z.enum(['WIDGET', 'WHATSAPP'])),
  scheduledAt: z.string().datetime().optional(),
});

export type RegisterTenantDto = z.infer<typeof RegisterTenantSchema>;
export type LoginDto = z.infer<typeof LoginSchema>;
export type CreateChatbotDto = z.infer<typeof CreateChatbotSchema>;
export type UpdateBrandingDto = z.infer<typeof UpdateBrandingSchema>;
export type SendMessageDto = z.infer<typeof SendMessageSchema>;
export type CreateCampaignDto = z.infer<typeof CreateCampaignSchema>;
