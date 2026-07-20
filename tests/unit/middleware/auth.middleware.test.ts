import 'reflect-metadata';
import jwt from 'jsonwebtoken';
import { authMiddleware } from '../../../src/shared/middleware/auth.middleware';
import { UnauthorizedError } from '../../../src/shared/errors/UnauthorizedError';

jest.mock('../../../src/config/env', () => ({
  __esModule: true,
  default: { JWT_SECRET: 'test_secret', JWT_EXPIRES_IN: '7d', NODE_ENV: 'test', LOG_LEVEL: 'silent' },
}));

const makeReq = (headers: Record<string, string> = {}) => ({
  headers,
  user: undefined as any,
});
const makeRes = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });
const makeNext = () => jest.fn();

describe('authMiddleware', () => {
  it('calls next with UnauthorizedError when no Authorization header', () => {
    const req = makeReq();
    const next = makeNext();
    authMiddleware(req as any, makeRes() as any, next);
    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it('calls next with UnauthorizedError for non-Bearer scheme', () => {
    const req = makeReq({ authorization: 'Basic abc123' });
    const next = makeNext();
    authMiddleware(req as any, makeRes() as any, next);
    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it('calls next with UnauthorizedError for missing token', () => {
    const req = makeReq({ authorization: 'Bearer' });
    const next = makeNext();
    authMiddleware(req as any, makeRes() as any, next);
    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it('calls next with UnauthorizedError for invalid token', () => {
    const req = makeReq({ authorization: 'Bearer invalid.token.here' });
    const next = makeNext();
    authMiddleware(req as any, makeRes() as any, next);
    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it('sets req.user and calls next for valid token', () => {
    const payload = { sub: 'user-1', email: 'test@example.com' };
    const token = jwt.sign(payload, 'test_secret', { expiresIn: '1h' });
    const req = makeReq({ authorization: `Bearer ${token}` });
    const next = makeNext();
    authMiddleware(req as any, makeRes() as any, next);
    expect(next).toHaveBeenCalledWith();
    expect(req.user).toMatchObject(payload);
  });
});
