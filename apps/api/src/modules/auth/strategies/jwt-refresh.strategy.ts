import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

export interface JwtRefreshPayload {
  sub: string;
  email: string;
  role: string;
}

export interface JwtRefreshUser {
  tenantId: string;
  email: string;
  role: string;
  refreshToken: string;
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme('Refresh'),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('app.jwtRefreshSecret') ?? '',
      passReqToCallback: true,
    });
  }

  validate(req: Request, payload: JwtRefreshPayload): JwtRefreshUser {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      throw new UnauthorizedException('No refresh token provided');
    }

    const refreshToken = authHeader.replace(/^Refresh\s+/i, '');
    return {
      tenantId: payload.sub,
      email: payload.email,
      role: payload.role,
      refreshToken,
    };
  }
}
