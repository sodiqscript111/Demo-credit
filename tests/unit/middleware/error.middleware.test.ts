import 'reflect-metadata';
import { errorMiddleware } from '../../../src/shared/middleware/error.middleware';
import { AppError } from '../../../src/shared/errors/AppError';
import { ZodError } from 'zod';

jest.mock('../../../src/shared/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const makeReq = () => ({});
const makeRes = () => {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  return res;
};
const makeNext = () => jest.fn();

describe('errorMiddleware', () => {
  it('returns 400 for ZodError with error details', () => {
    const zodError = new ZodError([
      { code: 'invalid_type', expected: 'string', received: 'number', path: ['email'], message: 'Expected string, received number' },
    ]);
    const res = makeRes();
    errorMiddleware(zodError, makeReq() as any, res as any, makeNext());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Validation failed',
      errors: zodError.errors,
    });
  });

  it('returns the status code and message from AppError', () => {
    const appError = new AppError('Not found', 404, 'NOT_FOUND');
    const res = makeRes();
    errorMiddleware(appError, makeReq() as any, res as any, makeNext());
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Not found',
      code: 'NOT_FOUND',
    });
  });

  it('returns 500 for unknown errors', () => {
    const unknownError = new Error('Something went wrong');
    const res = makeRes();
    errorMiddleware(unknownError, makeReq() as any, res as any, makeNext());
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Internal server error' });
  });
});
