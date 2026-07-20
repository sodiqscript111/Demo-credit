import { inject, injectable } from 'tsyringe';
import type { Knex } from 'knex';
import { TOKENS } from '../../shared/utils/constants';
import { logger } from '../../shared/utils/logger';
import { NotFoundError } from '../../shared/errors/NotFoundError';
import { ForbiddenError } from '../../shared/errors/ForbiddenError';
import { ValidationError } from '../../shared/errors/ValidationError';
import { InsufficientFundsError } from '../../shared/errors/InsufficientFundsError';
import { generateId } from '../../shared/utils/uuid';
import type { ILedgerRepository } from '../ledger/ledger.types';
import type { CreateWalletDTO, FundWalletDTO, WithdrawWalletDTO, IWalletsRepository, IWalletsService, Wallet } from './wallets.types';

@injectable()
export class WalletsService implements IWalletsService {
  constructor(
    @inject(TOKENS.Database) private readonly db: Knex,
    @inject(TOKENS.WalletsRepository) private readonly walletsRepository: IWalletsRepository,
    @inject(TOKENS.LedgerRepository) private readonly ledgerRepository: ILedgerRepository,
  ) {}

  async create(data: CreateWalletDTO): Promise<Wallet> {
    return this.walletsRepository.create(data);
  }

  async getById(id: string, requestingUserId: string): Promise<Wallet> {
    const wallet = await this.walletsRepository.findById(id);
    if (!wallet) throw new NotFoundError('Wallet not found');
    if (wallet.userId !== requestingUserId) throw new ForbiddenError('You do not have access to this wallet');
    return wallet;
  }

  async getByUserId(userId: string): Promise<Wallet | null> {
    return this.walletsRepository.findByUserId(userId);
  }

  async fund(userId: string, data: FundWalletDTO): Promise<Wallet> {
    const amount = parseFloat(data.amount);
    if (isNaN(amount) || amount <= 0) {
      throw new ValidationError('Amount must be a positive number');
    }

    return this.db.transaction(async (trx: Knex.Transaction) => {
      const wallet = await this.walletsRepository.findByUserId(userId, trx);
      if (!wallet) throw new NotFoundError('Wallet not found');

      const lockedWallet = await this.walletsRepository.findByIdForUpdate(wallet.id, trx);
      if (!lockedWallet) throw new NotFoundError('Wallet not found');

      await this.walletsRepository.credit(lockedWallet.id, data.amount, trx);

      await this.ledgerRepository.create(
        { walletId: lockedWallet.id, amount: data.amount, type: 'credit', reference: generateId(), transferId: null },
        trx,
      );

      logger.info({ walletId: lockedWallet.id, amount }, 'Wallet funded successfully');
      
      const updatedWallet = await this.walletsRepository.findById(lockedWallet.id, trx);
      return updatedWallet!;
    });
  }

  async withdraw(userId: string, data: WithdrawWalletDTO): Promise<Wallet> {
    const amount = parseFloat(data.amount);
    if (isNaN(amount) || amount <= 0) {
      throw new ValidationError('Amount must be a positive number');
    }

    return this.db.transaction(async (trx: Knex.Transaction) => {
      const wallet = await this.walletsRepository.findByUserId(userId, trx);
      if (!wallet) throw new NotFoundError('Wallet not found');

      const lockedWallet = await this.walletsRepository.findByIdForUpdate(wallet.id, trx);
      if (!lockedWallet) throw new NotFoundError('Wallet not found');

      if (parseFloat(lockedWallet.balance) < amount) {
        throw new InsufficientFundsError();
      }

      await this.walletsRepository.debit(lockedWallet.id, data.amount, trx);

      await this.ledgerRepository.create(
        { walletId: lockedWallet.id, amount: data.amount, type: 'debit', reference: generateId(), transferId: null },
        trx,
      );

      logger.info({ walletId: lockedWallet.id, amount }, 'Wallet withdrawn successfully');

      const updatedWallet = await this.walletsRepository.findById(lockedWallet.id, trx);
      return updatedWallet!;
    });
  }
}
