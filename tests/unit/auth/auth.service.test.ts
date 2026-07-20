import 'reflect-metadata';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
  compare: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock.jwt.token'),
  verify: jest.fn(),
}));

jest.mock('../../../src/config/env', () => ({
  __esModule: true,
  default: { JWT_SECRET: 'test_secret', JWT_EXPIRES_IN: '7d', NODE_ENV: 'test', LOG_LEVEL: 'silent' },
}));

jest.mock('../../../src/shared/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import bcrypt from 'bcrypt';
import { AuthService } from '../../../src/modules/auth/auth.service';
import type { IAdjutorService } from '../../../src/modules/adjutor/adjutor.types';
import type { IUsersRepository, User, UserWithHash } from '../../../src/modules/users/users.types';
import type { IWalletsRepository, Wallet } from '../../../src/modules/wallets/wallets.types';
import { ConflictError } from '../../../src/shared/errors/ConflictError';
import { UnauthorizedError } from '../../../src/shared/errors/UnauthorizedError';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const mockUser: User = { id: 'user-1', email: 'test@example.com', createdAt: new Date(), updatedAt: new Date() };
const mockUserWithHash: UserWithHash = { ...mockUser, passwordHash: 'hashed_password' };
const mockWallet: Wallet = { id: 'wallet-1', userId: 'user-1', balance: '0.0000', currency: 'NGN', createdAt: new Date(), updatedAt: new Date() };

// ─── Mock factories ───────────────────────────────────────────────────────────

const makeAdjutor    = (blacklisted = false): IAdjutorService => ({ isBlacklisted: jest.fn().mockResolvedValue(blacklisted) });
const makeUsersRepo  = (o: Partial<IUsersRepository> = {}): IUsersRepository => ({
  create: jest.fn().mockResolvedValue(mockUser),
  findById: jest.fn().mockResolvedValue(null),
  findByEmail: jest.fn().mockResolvedValue(null),
  findByEmailWithHash: jest.fn().mockResolvedValue(null),
  ...o,
});
const makeWalletsRepo = (o: Partial<IWalletsRepository> = {}): IWalletsRepository => ({
  create: jest.fn().mockResolvedValue(mockWallet),
  findById: jest.fn(),
  findByUserId: jest.fn(),
  findByIdForUpdate: jest.fn(),
  debit: jest.fn(),
  credit: jest.fn(),
  ...o,
});
const makeDb = () => ({
  transaction: jest.fn().mockImplementation((cb: (trx: unknown) => Promise<unknown>) => cb({})),
});

const makeService = (overrides: {
  adjutor?: IAdjutorService;
  usersRepo?: Partial<IUsersRepository>;
  walletsRepo?: Partial<IWalletsRepository>;
} = {}) => new AuthService(
  makeDb() as any,
  overrides.adjutor ?? makeAdjutor(),
  makeUsersRepo(overrides.usersRepo),
  makeWalletsRepo(overrides.walletsRepo),
);

// ─── register ────────────────────────────────────────────────────────────────

describe('AuthService.register', () => {
  const dto = { email: 'new@example.com', password: 'password123' };

  it('throws ConflictError when email is on the Karma blacklist', async () => {
    const service = makeService({ adjutor: makeAdjutor(true) });
    await expect(service.register(dto)).rejects.toBeInstanceOf(ConflictError);
  });

  it('throws ConflictError when email is already registered', async () => {
    const service = makeService({ usersRepo: { findByEmail: jest.fn().mockResolvedValue(mockUser) } });
    await expect(service.register(dto)).rejects.toBeInstanceOf(ConflictError);
  });

  it('hashes the password before storing', async () => {
    const service = makeService();
    await service.register(dto);
    expect(bcrypt.hash).toHaveBeenCalledWith(dto.password, 12);
  });

  it('creates a user and a wallet inside a transaction', async () => {
    const usersRepo   = makeUsersRepo();
    const walletsRepo = makeWalletsRepo();
    const service     = makeService({ usersRepo, walletsRepo });

    await service.register(dto);

    expect(usersRepo.create).toHaveBeenCalledTimes(1);
    expect(walletsRepo.create).toHaveBeenCalledWith({ userId: mockUser.id }, expect.anything());
  });

  it('returns accessToken, user, and wallet', async () => {
    const service = makeService();
    const result  = await service.register(dto);

    expect(result).toMatchObject({
      accessToken: 'mock.jwt.token',
      user:   { id: mockUser.id,   email: mockUser.email },
      wallet: { id: mockWallet.id, currency: mockWallet.currency },
    });
  });
});

// ─── login ───────────────────────────────────────────────────────────────────

describe('AuthService.login', () => {
  const dto = { email: 'test@example.com', password: 'password123' };

  it('throws UnauthorizedError when email is not found', async () => {
    const service = makeService({ usersRepo: { findByEmailWithHash: jest.fn().mockResolvedValue(null) } });
    await expect(service.login(dto)).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('throws UnauthorizedError when password is wrong', async () => {
    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);
    const service = makeService({ usersRepo: { findByEmailWithHash: jest.fn().mockResolvedValue(mockUserWithHash) } });
    await expect(service.login(dto)).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('returns accessToken and user on valid credentials', async () => {
    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);
    const service = makeService({ usersRepo: { findByEmailWithHash: jest.fn().mockResolvedValue(mockUserWithHash) } });
    const result  = await service.login(dto);

    expect(result).toMatchObject({
      accessToken: 'mock.jwt.token',
      user: { id: mockUser.id, email: mockUser.email },
    });
    expect(result.wallet).toBeUndefined();
  });

  it('uses the same error message for wrong email and wrong password (no enumeration)', async () => {
    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);
    const service = makeService({ usersRepo: { findByEmailWithHash: jest.fn().mockResolvedValue(mockUserWithHash) } });

    const err1 = await service.login({ ...dto, email: 'nobody@example.com' }).catch((e) => e);
    const err2 = await service.login({ ...dto, password: 'wrong' }).catch((e) => e);

    expect(err1.message).toBe(err2.message);
  });
});
