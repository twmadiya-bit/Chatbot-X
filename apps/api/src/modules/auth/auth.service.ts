import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { prisma } from '@chatbot-x/database';
import { Tenant, TenantRole } from '@chatbot-x/database';
import { RegisterTenantDto } from '@chatbot-x/shared';
import { TenantsService } from '../tenants/tenants.service';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResult extends AuthTokens {
  tenant: Omit<Tenant, 'passwordHash'>;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly tenantsService: TenantsService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
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

    return this.login(tenant);
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
