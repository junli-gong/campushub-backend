export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'DOUBLE_BOOKING'
  | 'NOT_FOUND'
  | 'INTERNAL_ERROR'
  | 'INVALID_TRANSITION';

export interface ErrorResponse {
  code: ErrorCode;
  message: string;
}

export class DomainError extends Error {
  constructor(
    public readonly code: Exclude<ErrorCode, 'INTERNAL_ERROR'>,
    message: string,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}
