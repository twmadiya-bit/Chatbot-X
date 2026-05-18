import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { prisma } from '@chatbot-x/database';
import { Tenant, TenantRole } from '@chatbot-x/database';
import { RegisterTenantDto } from '@chatbot-x/shared';
import { TenantsService } from '../tenants/tenants.service';
import { NotificationsService } from '../notifications/notifications.service';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResult extends AuthTokens {
  tenant: Omit<Tenant, 'passwordHash'>;
}

interface TokenEntry { tenantId: string; email: string; expiresAt: Date }

@Injectable()
export class AuthService {
  private readonly resetTokens = new Map<string, TokenEntry>();
  private readonly verifyTokens = new Map<string, TokenEntry>();

  constructor(
    private readonly tenantsService: TenantsService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly notifications: NotificationsService,
  ) {}

  async validateTenant(email: string, password: string): Promise<Tenant | null> {
    const tenant = await this.tenantsService.findByEmail(email);
    if (!tenant) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, tenant.passwordHash);
    if (!isPasswordValid) {
      return null;
    }

    return tenant;
  }

  async login(tenant: Tenant): Promise<LoginResult> {
    const tokens = await this.generateTokens(tenant.id, tenant.email, tenant.role);
    const { passwordHash: _hash, ...tenantData } = tenant;
    return {
      ...tokens,
      tenant: tenantData,
    };
  }

  async register(dto: RegisterTenantDto): Promise<LoginResult> {
    const existing = await this.tenantsService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const slug = await this.tenantsService.generateUniqueSlug(dto.name);
    const passwordHash = await bcrypt.hash(dto.password, 12);

    const tenant = await prisma.tenant.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone ?? null,
        timezone: dto.timezone ?? 'UTC',
        slug,
        passwordHash,
        role: TenantRole.CUSTOMER,
        notificationPrefs: {
          create: {
            usageAlertThresholdPct: 80,
            billingEmails: true,
            usageReportEmails: true,
            handoffEmails: true,
            sentimentAlertEmails: true,
          },
        },
      },
    });

    // Fire-and-forget welcome / verification email
    void this.sendVerificationEmail(tenant.id, tenant.email);

    return this.login(tenant);
  }

  async requestPasswordReset(email: string): Promise<void> {
    const tenant = await this.tenantsService.findByEmail(email);
    if (!tenant) return; // don't reveal whether email exists

    const token = crypto.randomUUID();
    this.resetTokens.set(token, { tenantId: tenant.id, email: tenant.email, expiresAt: new Date(Date.now() + 3_600_000) });

    const dashboardUrl = this.configService.get<string>('app.dashboardUrl') ?? 'http://localhost:3000';
    await this.notifications.sendEmail({
      to: tenant.email,
      subject: 'Reset your Chatbot-X password',
      html: `<h2>Password Reset</h2><p>Click the link below to reset your password. This link expires in 1 hour.</p><a href="${dashboardUrl}/reset-password?token=${token}" style="display:inline-block;padding:10px 20px;background:#6366f1;color:#fff;border-radius:8px;text-decoration:none;">Reset Password</a><p style="color:#6b7280;font-size:12px;margin-top:16px;">If you didn't request this, you can safely ignore this email.</p>`,
      text: `Reset your password: ${dashboardUrl}/reset-password?token=${token}`,
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const entry = this.resetTokens.get(token);
    if (!entry || entry.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.tenant.update({ where: { id: entry.tenantId }, data: { passwordHash } });
    this.resetTokens.delete(token);
  }

  async sendVerificationEmail(tenantId: string, email: string): Promise<void> {
    const token = crypto.randomUUID();
    this.verifyTokens.set(token, { tenantId, email, expiresAt: new Date(Date.now() + 86_400_000) });

    const apiUrl = this.configService.get<string>('app.apiUrl') ?? 'http://localhost:3001';
    await this.notifications.sendEmail({
      to: email,
      subject: 'Verify your Chatbot-X email address',
      html: `<h2>Welcome to Chatbot-X!</h2><p>Please verify your email address by clicking the link below:</p><a href="${apiUrl}/api/v1/auth/verify-email?token=${token}" style="display:inline-block;padding:10px 20px;background:#6366f1;color:#fff;border-radius:8px;text-decoration:none;">Verify Email</a><p style="color:#6b7280;font-size:12px;margin-top:16px;">This link expires in 24 hours.</p>`,
      text: `Verify your email: ${apiUrl}/api/v1/auth/verify-email?token=${token}`,
    });
  }

  async verifyEmail(token: string): Promise<void> {
    const entry = this.verifyTokens.get(token);
    if (!entry || entry.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired verification token');
    }
    this.verifyTokens.delete(token);
  }

  async refreshTokens(tenantId: string, refreshToken: string): Promise<AuthTokens> {
    const tenant = await this.tenantsService.findById(tenantId);

    let payload: { sub: string; email: string; role: string };
    try {
      payload = await this.jwtService.verifyAsync<{ sub: string; email: string; role: string }>(
        refreshToken,
        {
          secret: this.configService.get<string>('app.jwtRefreshSecret'),
        },
      );
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (payload.sub !== tenant.id) {
      throw new UnauthorizedException('Refresh token subject mismatch');
    }

    return this.generateTokens(tenant.id, tenant.email, tenant.role);
  }

  async generateTokens(tenantId: string, email: string, role: TenantRole): Promise<AuthTokens> {
    const payload = { sub: tenantId, email, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('app.jwtSecret'),
        expiresIn: this.configService.get<string>('app.jwtExpiresIn'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('app.jwtRefreshSecret'),
        expiresIn: this.configService.get<string>('app.jwtRefreshExpiresIn'),
      }),
    ]);

    return { accessToken, refreshToken };
  }
}
