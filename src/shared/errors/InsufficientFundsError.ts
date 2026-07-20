import { AppError } from './AppError';

export class InsufficientFundsError extends AppError {
  constructor(message = 'Insufficient funds', code = 'INSUFFICIENT_FUNDS') {
    super(message, 422, code);
  }
}
