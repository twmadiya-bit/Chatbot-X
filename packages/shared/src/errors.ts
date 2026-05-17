export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super('NOT_FOUND', `${resource} not found`, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super('UNAUTHORIZED', message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super('FORBIDDEN', message, 403);
  }
}

export class EntitlementError extends AppError {
  constructor(feature: string) {
    super('ENTITLEMENT_ERROR', `Your plan does not include: ${feature}`, 403);
  }
}

export class AiProviderError extends AppError {
  constructor(provider: string, message: string) {
    super('AI_PROVIDER_ERROR', `${provider}: ${message}`, 502);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super('VALIDATION_ERROR', message, 422);
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded') {
    super('RATE_LIMIT', message, 429);
  }
}
