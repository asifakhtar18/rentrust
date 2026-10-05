import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from './error-codes';

/**
 * Base typed application error. Carries a machine-readable `code` alongside the
 * HTTP status so the global exception filter can render a consistent error
 * envelope without leaking internal exception details.
 */
export class AppException extends HttpException {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    status: HttpStatus,
    public readonly details?: Record<string, unknown>,
  ) {
    super({ code, message, details }, status);
  }
}

export class ValidationException extends AppException {
  constructor(message = 'Validation failed', details?: Record<string, unknown>) {
    super(ErrorCode.VALIDATION_ERROR, message, HttpStatus.UNPROCESSABLE_ENTITY, details);
  }
}

export class BadRequestAppException extends AppException {
  constructor(message = 'Bad request', code: ErrorCode = ErrorCode.BAD_REQUEST) {
    super(code, message, HttpStatus.BAD_REQUEST);
  }
}

export class UnauthorizedAppException extends AppException {
  constructor(message = 'Unauthorized', code: ErrorCode = ErrorCode.UNAUTHORIZED) {
    super(code, message, HttpStatus.UNAUTHORIZED);
  }
}

export class ForbiddenAppException extends AppException {
  constructor(message = 'Forbidden', code: ErrorCode = ErrorCode.FORBIDDEN) {
    super(code, message, HttpStatus.FORBIDDEN);
  }
}

export class NotFoundAppException extends AppException {
  constructor(message = 'Not found', code: ErrorCode = ErrorCode.NOT_FOUND) {
    super(code, message, HttpStatus.NOT_FOUND);
  }
}

export class ConflictAppException extends AppException {
  constructor(message = 'Conflict', code: ErrorCode = ErrorCode.CONFLICT) {
    super(code, message, HttpStatus.CONFLICT);
  }
}
