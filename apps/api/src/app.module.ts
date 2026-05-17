import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bullmq';
import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { ChatbotsModule } from './modules/chatbots/chatbots.module';
import { AiGatewayModule } from './modules/ai-gateway/ai-gateway.module';
import { ChatModule } from './modules/chat/chat.module';
import { BillingModule } from './modules/billing/billing.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { KnowledgeModule } from './modules/knowledge/knowledge.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';
import { WidgetModule } from './modules/widget/widget.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { MemoryModule } from './modules/memory/memory.module';
import { AdminModule } from './modules/admin/admin.module';
import { appConfig, redisConfig, aiConfig } from './config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, redisConfig, aiConfig],
      envFilePath: ['.env.local', '.env'],
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get('redis.host'),
          port: config.get('redis.port'),
          password: config.get('redis.password'),
        },
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    TenantsModule,
    ChatbotsModule,
    AiGatewayModule,
    ChatModule,
    BillingModule,
    AnalyticsModule,
    KnowledgeModule,
    IntegrationsModule,
    WhatsappModule,
    WidgetModule,
    CampaignsModule,
    MemoryModule,
    AdminModule,
  ],
})
export class AppModule {}
