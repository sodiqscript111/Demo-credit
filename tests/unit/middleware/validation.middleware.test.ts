import { validate } from '../../../src/shared/middleware/validation.middleware';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

describe('ValidationMiddleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = { body: {}, query: {}, params: {} };
    res = {};
    next = jest.fn();
  });

  it('calls next if validation passes on body', () => {
    const schema = z.object({ name: z.string() });
    req.body = { name: 'test' };
    const middleware = validate(schema);

    middleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.body).toEqual({ name: 'test' });
  });

  it('throws ZodError if validation fails', () => {
    const schema = z.object({ name: z.string() });
    req.body = { age: 20 };
    const middleware = validate(schema);

    expect(() => middleware(req as Request, res as Response, next)).toThrow();
    expect(next).not.toHaveBeenCalled();
  });

  it('validates query params if source is query', () => {
    const schema = z.object({ page: z.string() });
    req.query = { page: '1' };
    const middleware = validate(schema, 'query');

    middleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('validates params if source is params', () => {
    const schema = z.object({ id: z.string() });
    req.params = { id: '123' };
    const middleware = validate(schema, 'params');

    middleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
  });
});
