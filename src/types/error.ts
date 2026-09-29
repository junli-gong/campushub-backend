export type ErrorCode =
  'VALIDATION_ERROR' | 'DOUBLE_BOOKING' | 'NOT_FOUND' | 'INTERNAL_ERROR';

export interface ErrorResponse {
  code: ErrorCode;
  message: string;
}

export class DomainError extends Error {
  constructor(
    public readonly code: 'VALIDATION_ERROR' | 'DOUBLE_BOOKING',
    message: string,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}
