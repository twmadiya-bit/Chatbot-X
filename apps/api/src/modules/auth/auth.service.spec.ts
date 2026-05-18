import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

import { AuthService } from './auth.service';
import { TenantsService } from '../tenants/tenants.service';
import { NotificationsService } from '../notifications/notifications.service';
import { prisma } from '@chatbot-x/database';

// ── mock the Prisma singleton ──────────────────────────────────────────────
jest.mock('@chatbot-x/database', () => ({
  prisma: {
    tenant: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
  TenantRole: { CUSTOMER: 'CUSTOMER', ADMIN: 'ADMIN' },
}));

jest.mock('bcrypt', () => ({ compare: jest.fn(), hash: jest.fn() }));

// ── helpers ────────────────────────────────────────────────────────────────
const makeTenant = (overrides = {}) => ({
  id: 'tenant-1',
  email: 'user@example.com',
  name: 'Acme',
  role: 'CUSTOMER',
  passwordHash: '$2b$12$hashedpassword',
  slug: 'acme',
  phone: null,
  timezone: 'UTC',
  status: 'ACTIVE',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('AuthService', () => {
  let service: AuthService;
  let tenantsService: jest.Mocked<Pick<TenantsService, 'findByEmail' | 'generateUniqueSlug'>>;
  let jwtService: jest.Mocked<Pick<JwtService, 'signAsync'>>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: TenantsService,
          useValue: { findByEmail: jest.fn(), generateUniqueSlug: jest.fn() },
        },
        {
          provide: JwtService,
          useValue: { signAsync: jest.fn().mockResolvedValue('mock-jwt') },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('mock-value') },
        },
        {
          provide: NotificationsService,
          useValue: {
            sendEmail: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get(AuthService);
    tenantsService = module.get(TenantsService);
    jwtService = module.get(JwtService);
  });

  // ── validateTenant ──────────────────────────────────────────────────────
  describe('validateTenant', () => {
    it('returns null when email not found', async () => {
      (tenantsService.findByEmail as jest.Mock).mockResolvedValue(null);
      await expect(service.validateTenant('x@x.com', 'pw')).resolves.toBeNull();
    });

    it('returns null when password is wrong', async () => {
      (tenantsService.findByEmail as jest.Mock).mockResolvedValue(makeTenant());
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(service.validateTenant('user@example.com', 'wrong')).resolves.toBeNull();
    });

    it('returns the tenant when credentials are correct', async () => {
      const tenant = makeTenant();
      (tenantsService.findByEmail as jest.Mock).mockResolvedValue(tenant);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      await expect(service.validateTenant('user@example.com', 'correct')).resolves.toBe(tenant);
    });
  });

  // ── login ───────────────────────────────────────────────────────────────
  describe('login', () => {
    it('returns access/refresh tokens and tenant without passwordHash', async () => {
      const result = await service.login(makeTenant() as never);
      expect(result).toMatchObject({ accessToken: 'mock-jwt', refreshToken: 'mock-jwt' });
      expect(result.tenant).not.toHaveProperty('passwordHash');
      expect(result.tenant).toHaveProperty('email', 'user@example.com');
    });
  });

  // ── register ────────────────────────────────────────────────────────────
  describe('register', () => {
    it('throws ConflictException when email already exists', async () => {
      (tenantsService.findByEmail as jest.Mock).mockResolvedValue(makeTenant());
      await expect(
        service.register({ name: 'Test', email: 'user@example.com', password: 'Pass1!' } as never),
      ).rejects.toThrow(ConflictException);
    });

    it('creates tenant and returns tokens on success', async () => {
      (tenantsService.findByEmail as jest.Mock).mockResolvedValue(null);
      (tenantsService.generateUniqueSlug as jest.Mock).mockResolvedValue('acme');
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-pw');
      (prisma.tenant.create as jest.Mock).mockResolvedValue(makeTenant());

      const result = await service.register({
        name: 'Acme', email: 'user@example.com', password: 'Pass1!',
      } as never);

      expect(result).toHaveProperty('accessToken');
      expect(result.tenant).not.toHaveProperty('passwordHash');
      expect(prisma.tenant.create).toHaveBeenCalledTimes(1);
    });
  });

  // ── requestPasswordReset ────────────────────────────────────────────────
  describe('requestPasswordReset', () => {
    it('resolves silently for unknown email (no leak)', async () => {
      (tenantsService.findByEmail as jest.Mock).mockResolvedValue(null);
      await expect(service.requestPasswordReset('nobody@x.com')).resolves.toBeUndefined();
    });

    it('stores a reset token and sends email for known email', async () => {
      (tenantsService.findByEmail as jest.Mock).mockResolvedValue(makeTenant());
      const notif = service['notifications'] as unknown as { sendEmail: jest.Mock };
      await service.requestPasswordReset('user@example.com');
      expect(notif.sendEmail).toHaveBeenCalledTimes(1);
    });
  });

  // ── generateTokens ──────────────────────────────────────────────────────
  describe('generateTokens', () => {
    it('calls signAsync twice (access + refresh)', async () => {
      await service.generateTokens('id-1', 'email@x.com', 'CUSTOMER' as never);
      expect(jwtService.signAsync).toHaveBeenCalledTimes(2);
    });
  });
});
