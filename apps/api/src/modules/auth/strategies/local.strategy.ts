import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';
import { Tenant } from '@chatbot-x/database';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({ usernameField: 'email' });
  }

  async validate(email: string, password: string): Promise<Tenant> {
    const tenant = await this.authService.validateTenant(email, password);
    if (!tenant) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return tenant;
  }
}
