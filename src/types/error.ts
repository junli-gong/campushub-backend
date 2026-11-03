import type { ErrorCode } from '../../shared/contracts';

export class DomainError extends Error {
  constructor(
    public readonly code: Exclude<ErrorCode, 'INTERNAL_ERROR'>,
    message: string,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}
