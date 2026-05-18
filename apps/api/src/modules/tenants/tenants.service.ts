import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@chatbot-x/database';
import { Tenant, UsageMonthly, NotificationPreference } from '@chatbot-x/database';

export interface UpdateProfileDto {
  name?: string;
  phone?: string;
  timezone?: string;
}

@Injectable()
export class TenantsService {
  async findById(id: string): Promise<Tenant> {
    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    return tenant;
  }

  async findByEmail(email: string): Promise<Tenant | null> {
    return prisma.tenant.findUnique({ where: { email } });
  }

  async findBySlug(slug: string): Promise<Tenant | null> {
    return prisma.tenant.findUnique({ where: { slug } });
  }

  async updateProfile(tenantId: string, dto: UpdateProfileDto): Promise<Tenant> {
    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.timezone !== undefined && { timezone: dto.timezone }),
      },
    });
    return tenant;
  }

  async getUsageSummary(tenantId: string): Promise<UsageMonthly | null> {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

    return prisma.usageMonthly.findFirst({
      where: {
        tenantId,
        billingPeriodStart: {
          gte: periodStart,
        },
      },
      orderBy: { billingPeriodStart: 'desc' },
    });
  }

  async getNotificationPreferences(tenantId: string): Promise<NotificationPreference | null> {
    return prisma.notificationPreference.findUnique({ where: { tenantId } });
  }

  async upsertNotificationPreferences(
    tenantId: string,
    dto: Partial<Pick<NotificationPreference, 'billingEmails' | 'usageReportEmails' | 'handoffEmails' | 'sentimentAlertEmails'>>,
  ): Promise<NotificationPreference> {
    return prisma.notificationPreference.upsert({
      where: { tenantId },
      create: { tenantId, ...dto },
      update: dto,
    });
  }

  async generateUniqueSlug(name: string): Promise<string> {
    const base = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 80);

    const existing = await prisma.tenant.findUnique({ where: { slug: base } });
    if (!existing) {
      return base;
    }

    const suffix = Math.random().toString(36).slice(2, 7);
    const candidate = `${base}-${suffix}`;
    const collision = await prisma.tenant.findUnique({ where: { slug: candidate } });
    if (!collision) {
      return candidate;
    }

    const suffix2 = Date.now().toString(36);
    return `${base}-${suffix2}`;
  }
}
