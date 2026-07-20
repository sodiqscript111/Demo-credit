import 'reflect-metadata';
import { TransfersService } from '../../../src/modules/transfers/transfers.service';
import type { ITransfersRepository, Transfer } from '../../../src/modules/transfers/transfers.types';
import type { IWalletsRepository, Wallet } from '../../../src/modules/wallets/wallets.types';
import type { ILedgerRepository } from '../../../src/modules/ledger/ledger.types';
import { NotFoundError } from '../../../src/shared/errors/NotFoundError';
import { ForbiddenError } from '../../../src/shared/errors/ForbiddenError';
import { ValidationError } from '../../../src/shared/errors/ValidationError';
import { InsufficientFundsError } from '../../../src/shared/errors/InsufficientFundsError';

jest.mock('../../../src/shared/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// ─── Fixtures ────────────────────────────────────────────────────────────────

const USER_A = 'user-aaa';
const USER_B = 'user-bbb';

const walletA: Wallet = { id: 'aaaaaaaa-0000-0000-0000-000000000001', userId: USER_A, balance: '5000.0000', currency: 'NGN', createdAt: new Date(), updatedAt: new Date() };
const walletB: Wallet = { id: 'bbbbbbbb-0000-0000-0000-000000000002', userId: USER_B, balance: '1000.0000', currency: 'NGN', createdAt: new Date(), updatedAt: new Date() };

const completedTransfer: Transfer = {
  id: 'transfer-1', fromWalletId: walletA.id, toWalletId: walletB.id,
  amount: '200.00', status: 'completed', idempotencyKey: 'key-abc', createdAt: new Date(),
};

// ─── Mock factories ───────────────────────────────────────────────────────────

const makeTransfersRepo = (o: Partial<ITransfersRepository> = {}): ITransfersRepository => ({
  create: jest.fn().mockResolvedValue(completedTransfer),
  findById: jest.fn().mockResolvedValue(null),
  findByIdempotencyKey: jest.fn().mockResolvedValue(null),
  ...o,
});

const makeWalletsRepo = (from: Wallet, to: Wallet, o: Partial<IWalletsRepository> = {}): IWalletsRepository => ({
  create: jest.fn(),
  findById: jest.fn().mockImplementation((id: string) =>
    Promise.resolve(id === from.id ? from : id === to.id ? to : null),
  ),
  findByUserId: jest.fn(),
  findByIdForUpdate: jest.fn().mockImplementation((id: string) =>
    Promise.resolve(id === from.id ? from : to),
  ),
  debit: jest.fn().mockResolvedValue(undefined),
  credit: jest.fn().mockResolvedValue(undefined),
  ...o,
});

const makeLedgerRepo = (o: Partial<ILedgerRepository> = {}): ILedgerRepository => ({
  listByWalletId: jest.fn(), create: jest.fn().mockResolvedValue({}), ...o,
});

const makeMockDb = () => ({
  transaction: jest.fn().mockImplementation((cb: (trx: unknown) => Promise<unknown>) => cb({})),
});

const makeService = (o: {
  transfersRepo?: Partial<ITransfersRepository>;
  walletsRepo?: Partial<IWalletsRepository>;
  ledgerRepo?: Partial<ILedgerRepository>;
  fromWallet?: Wallet; toWallet?: Wallet;
} = {}) => {
  const from = o.fromWallet ?? walletA;
  const to   = o.toWallet   ?? walletB;
  return {
    service:       new TransfersService(makeMockDb() as any, makeTransfersRepo(o.transfersRepo), makeWalletsRepo(from, to, o.walletsRepo), makeLedgerRepo(o.ledgerRepo)),
    walletsRepo:   makeWalletsRepo(from, to, o.walletsRepo),
    transfersRepo: makeTransfersRepo(o.transfersRepo),
    ledgerRepo:    makeLedgerRepo(o.ledgerRepo),
    db:            makeMockDb(),
  };
};

const dto = { fromWalletId: walletA.id, toWalletId: walletB.id, amount: '200.00', idempotencyKey: 'key-abc' };

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('TransfersService.create', () => {
  describe('idempotency', () => {
    it('returns existing transfer without opening a transaction', async () => {
      const db = makeMockDb();
      const service = new TransfersService(
        db as any,
        makeTransfersRepo({ findByIdempotencyKey: jest.fn().mockResolvedValue(completedTransfer) }),
        makeWalletsRepo(walletA, walletB),
        makeLedgerRepo(),
      );
      const result = await service.create(dto, USER_A);
      expect(result).toBe(completedTransfer);
      expect(db.transaction).not.toHaveBeenCalled();
    });
  });

  describe('validation', () => {
    it('throws ValidationError when wallets are the same', async () => {
      const { service } = makeService();
      await expect(service.create({ ...dto, toWalletId: dto.fromWalletId }, USER_A)).rejects.toBeInstanceOf(ValidationError);
    });

    it('throws ValidationError when amount is zero', async () => {
      const { service } = makeService();
      await expect(service.create({ ...dto, amount: '0' }, USER_A)).rejects.toBeInstanceOf(ValidationError);
    });
  });

  describe('ownership', () => {
    it('throws ForbiddenError when requesting user does not own the source wallet', async () => {
      const { service } = makeService();
      await expect(service.create(dto, USER_B)).rejects.toBeInstanceOf(ForbiddenError);
    });
  });

  describe('locking', () => {
    it('throws NotFoundError when source wallet does not exist', async () => {
      const { service } = makeService({
        walletsRepo: { findByIdForUpdate: jest.fn().mockImplementation((id: string) => Promise.resolve(id === walletA.id ? null : walletB)) },
      });
      await expect(service.create(dto, USER_A)).rejects.toBeInstanceOf(NotFoundError);
    });

    it('locks wallets in sorted UUID order to prevent deadlocks', async () => {
      const wRepo = makeWalletsRepo(walletA, walletB);
      const service = new TransfersService(makeMockDb() as any, makeTransfersRepo(), wRepo, makeLedgerRepo());
      await service.create(dto, USER_A);
      const ids = (wRepo.findByIdForUpdate as jest.Mock).mock.calls.map(([id]: [string]) => id);
      expect(ids).toEqual([...ids].sort());
    });
  });

  describe('balance', () => {
    it('throws InsufficientFundsError when balance is too low', async () => {
      const { service } = makeService({ fromWallet: { ...walletA, balance: '100.0000' } });
      await expect(service.create({ ...dto, amount: '500.00' }, USER_A)).rejects.toBeInstanceOf(InsufficientFundsError);
    });

    it('allows transfer when balance exactly equals amount', async () => {
      const { service } = makeService({ fromWallet: { ...walletA, balance: '200.0000' } });
      await expect(service.create({ ...dto, amount: '200.00' }, USER_A)).resolves.toBeDefined();
    });
  });

  describe('happy path', () => {
    it('debits source and credits destination', async () => {
      const wRepo = makeWalletsRepo(walletA, walletB);
      const service = new TransfersService(makeMockDb() as any, makeTransfersRepo(), wRepo, makeLedgerRepo());
      await service.create(dto, USER_A);
      expect(wRepo.debit).toHaveBeenCalledWith(walletA.id, dto.amount, expect.anything());
      expect(wRepo.credit).toHaveBeenCalledWith(walletB.id, dto.amount, expect.anything());
    });

    it('inserts one debit and one credit ledger entry', async () => {
      const lRepo = makeLedgerRepo();
      const service = new TransfersService(makeMockDb() as any, makeTransfersRepo(), makeWalletsRepo(walletA, walletB), lRepo);
      await service.create(dto, USER_A);
      expect(lRepo.create).toHaveBeenCalledTimes(2);
      const types = (lRepo.create as jest.Mock).mock.calls.map(([e]: [{ type: string }]) => e.type);
      expect(types).toContain('debit');
      expect(types).toContain('credit');
    });

    it('returns the completed transfer', async () => {
      const { service } = makeService();
      await expect(service.create(dto, USER_A)).resolves.toEqual(completedTransfer);
    });
  });
});

describe('TransfersService.getById', () => {
  it('returns the transfer when found and owned by requesting user', async () => {
    const service = new TransfersService(makeMockDb() as any, makeTransfersRepo({ findById: jest.fn().mockResolvedValue(completedTransfer) }), makeWalletsRepo(walletA, walletB), makeLedgerRepo());
    await expect(service.getById('transfer-1', USER_A)).resolves.toEqual(completedTransfer);
  });

  it('throws NotFoundError when not found', async () => {
    const service = new TransfersService(makeMockDb() as any, makeTransfersRepo({ findById: jest.fn().mockResolvedValue(null) }), makeWalletsRepo(walletA, walletB), makeLedgerRepo());
    await expect(service.getById('missing', USER_A)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('throws ForbiddenError when requesting user does not own the transfer', async () => {
    const service = new TransfersService(makeMockDb() as any, makeTransfersRepo({ findById: jest.fn().mockResolvedValue(completedTransfer) }), makeWalletsRepo(walletA, walletB), makeLedgerRepo());
    await expect(service.getById('transfer-1', 'user-ccc')).rejects.toBeInstanceOf(ForbiddenError);
  });
});
