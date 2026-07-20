import 'reflect-metadata';

jest.mock('../../../src/shared/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
import { WalletsService } from '../../../src/modules/wallets/wallets.service';
import type { IWalletsRepository, Wallet } from '../../../src/modules/wallets/wallets.types';
import { NotFoundError } from '../../../src/shared/errors/NotFoundError';
import { ForbiddenError } from '../../../src/shared/errors/ForbiddenError';

import type { ILedgerRepository } from '../../../src/modules/ledger/ledger.types';
import type { Knex } from 'knex';

const existingWallet: Wallet = {
  id: 'wallet-1',
  userId: 'user-1',
  balance: '0.0000',
  currency: 'NGN',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const makeRepository = (overrides: Partial<IWalletsRepository> = {}): IWalletsRepository => ({
  create: jest.fn().mockResolvedValue(existingWallet),
  findById: jest.fn().mockResolvedValue(null),
  findByUserId: jest.fn().mockResolvedValue(null),
  findByIdForUpdate: jest.fn().mockResolvedValue(null),
  debit: jest.fn().mockResolvedValue(undefined),
  credit: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const makeLedgerRepository = (): ILedgerRepository => ({
  create: jest.fn().mockResolvedValue({}),
  listByWalletId: jest.fn().mockResolvedValue({ items: [], total: 0 }),
});

const makeDb = (): Knex => {
  const db = jest.fn() as unknown as Knex;
  db.transaction = jest.fn().mockImplementation(async (cb) => cb({} as Knex.Transaction));
  return db;
};

describe('WalletsService', () => {
  describe('create', () => {
    it('calls repository.create and returns the result', async () => {
      const db = makeDb();
      const repo = makeRepository();
      const ledgerRepo = makeLedgerRepository();
      const service = new WalletsService(db, repo, ledgerRepo);

      const result = await service.create({ userId: 'user-1', currency: 'NGN' });

      expect(repo.create).toHaveBeenCalledWith({ userId: 'user-1', currency: 'NGN' });
      expect(result).toEqual(existingWallet);
    });
  });

  describe('getById', () => {
    it('returns the wallet when requesting user is the owner', async () => {
      const db = makeDb();
      const repo = makeRepository({ findById: jest.fn().mockResolvedValue(existingWallet) });
      const ledgerRepo = makeLedgerRepository();
      const service = new WalletsService(db, repo, ledgerRepo);

      await expect(service.getById('wallet-1', 'user-1')).resolves.toEqual(existingWallet);
    });

    it('throws NotFoundError when wallet does not exist', async () => {
      const db = makeDb();
      const repo = makeRepository({ findById: jest.fn().mockResolvedValue(null) });
      const ledgerRepo = makeLedgerRepository();
      const service = new WalletsService(db, repo, ledgerRepo);

      await expect(service.getById('missing', 'user-1')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('throws ForbiddenError when requesting user does not own the wallet', async () => {
      const db = makeDb();
      const repo = makeRepository({ findById: jest.fn().mockResolvedValue(existingWallet) });
      const ledgerRepo = makeLedgerRepository();
      const service = new WalletsService(db, repo, ledgerRepo);

      await expect(service.getById('wallet-1', 'other-user')).rejects.toBeInstanceOf(ForbiddenError);
    });
  });

  describe('getByUserId', () => {
    it('returns the wallet when found', async () => {
      const db = makeDb();
      const repo = makeRepository({ findByUserId: jest.fn().mockResolvedValue(existingWallet) });
      const ledgerRepo = makeLedgerRepository();
      const service = new WalletsService(db, repo, ledgerRepo);

      await expect(service.getByUserId('user-1')).resolves.toEqual(existingWallet);
    });

    it('returns null when user has no wallet', async () => {
      const db = makeDb();
      const repo = makeRepository();
      const ledgerRepo = makeLedgerRepository();
      const service = new WalletsService(db, repo, ledgerRepo);

      await expect(service.getByUserId('user-1')).resolves.toBeNull();
    });
  });
});
