import { requireIdempotencyKey } from '../../../src/shared/middleware/idempotency.middleware';
import { ValidationError } from '../../../src/shared/errors/ValidationError';
import { IDEMPOTENCY_KEY_HEADER } from '../../../src/shared/utils/constants';
import type { Request, Response, NextFunction } from 'express';

describe('IdempotencyMiddleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      header: jest.fn(),
    };
    res = {};
    next = jest.fn();
  });

  it('calls next with ValidationError if header is missing', () => {
    (req.header as jest.Mock).mockReturnValue(undefined);

    requireIdempotencyKey(req as Request, res as Response, next);

    expect(req.header).toHaveBeenCalledWith(IDEMPOTENCY_KEY_HEADER);
    expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
  });

  it('sets req.idempotencyKey and calls next if header is present', () => {
    (req.header as jest.Mock).mockReturnValue('test-key');

    requireIdempotencyKey(req as Request, res as Response, next);

    expect(req.idempotencyKey).toBe('test-key');
    expect(next).toHaveBeenCalledWith();
  });
});
