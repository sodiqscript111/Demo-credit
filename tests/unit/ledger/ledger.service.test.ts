import 'reflect-metadata';
import { LedgerService } from '../../../src/modules/ledger/ledger.service';
import type { ILedgerRepository } from '../../../src/modules/ledger/ledger.types';
import type { IWalletsRepository, Wallet } from '../../../src/modules/wallets/wallets.types';
import { NotFoundError } from '../../../src/shared/errors/NotFoundError';
import { ForbiddenError } from '../../../src/shared/errors/ForbiddenError';

const existingWallet: Wallet = {
  id: 'wallet-1',
  userId: 'user-1',
  balance: '0.0000',
  currency: 'NGN',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('LedgerService', () => {
  let ledgerRepo: jest.Mocked<ILedgerRepository>;
  let walletsRepo: jest.Mocked<IWalletsRepository>;
  let service: LedgerService;

  beforeEach(() => {
    ledgerRepo = {
      create: jest.fn(),
      listByWalletId: jest.fn().mockResolvedValue([]),
    };
    walletsRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      findByIdForUpdate: jest.fn(),
      debit: jest.fn(),
      credit: jest.fn(),
    };
    service = new LedgerService(ledgerRepo, walletsRepo);
  });

  describe('listEntries', () => {
    it('returns entries if user owns the wallet', async () => {
      walletsRepo.findById.mockResolvedValue(existingWallet);
      const query = { walletId: 'wallet-1' };

      const result = await service.listEntries(query, 'user-1');

      expect(walletsRepo.findById).toHaveBeenCalledWith('wallet-1');
      expect(ledgerRepo.listByWalletId).toHaveBeenCalledWith(query);
      expect(result).toEqual([]);
    });

    it('throws NotFoundError if wallet does not exist', async () => {
      walletsRepo.findById.mockResolvedValue(null);
      const query = { walletId: 'wallet-1' };

      await expect(service.listEntries(query, 'user-1')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('throws ForbiddenError if user does not own the wallet', async () => {
      walletsRepo.findById.mockResolvedValue(existingWallet);
      const query = { walletId: 'wallet-1' };

      await expect(service.listEntries(query, 'user-2')).rejects.toBeInstanceOf(ForbiddenError);
    });
  });
});
