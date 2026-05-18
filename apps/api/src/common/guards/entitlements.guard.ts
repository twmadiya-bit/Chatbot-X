import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  PaymentRequiredException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { prisma } from '@chatbot-x/database';
import { REQUIRED_FEATURE_KEY } from '../decorators/require-feature.decorator';

@Injectable()
export class EntitlementsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const featureKey = this.reflector.getAllAndOverride<string>(REQUIRED_FEATURE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!featureKey) return true;

    const request = context.switchToHttp().getRequest<{ params: { chatbotId?: string } }>();
    const chatbotId = request.params.chatbotId;
    if (!chatbotId) return true;

    // Check subscription is active
    const subscription = await prisma.chatbotSubscription.findUnique({
      where: { chatbotId },
    });

    if (subscription && subscription.status !== 'ACTIVE' && subscription.status !== 'TRIALING') {
      throw new PaymentRequiredException('An active subscription is required.');
    }

    // Check feature is enabled in plan
    const chatbot = await prisma.chatbot.findUnique({
      where: { id: chatbotId },
      select: { industryPlanId: true },
    });

    if (!chatbot?.industryPlanId) {
      throw new ForbiddenException(`Your plan does not include: ${featureKey}`);
    }

    const planFeature = await prisma.planFeature.findFirst({
      where: {
        industryPlanId: chatbot.industryPlanId,
        isEnabled: true,
        feature: { key: featureKey },
      },
    });

    if (!planFeature) {
      throw new ForbiddenException(`Your plan does not include: ${featureKey}`);
    }

    return true;
  }
}
