import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export interface JwtPayload {
  tenantId: string;
  email: string;
  role: string;
}

export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<Request & { user: JwtPayload }>();
    return request.user.tenantId;
  },
);
