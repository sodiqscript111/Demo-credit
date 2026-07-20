import { inject, injectable } from 'tsyringe';
import type { Knex } from 'knex';
import { TOKENS } from '../../shared/utils/constants';
import { generateId } from '../../shared/utils/uuid';
import type { CreateWalletDTO, IWalletsRepository, Wallet } from './wallets.types';

@injectable()
export class WalletsRepository implements IWalletsRepository {
  constructor(@inject(TOKENS.Database) private readonly db: Knex) {}

  async create(data: CreateWalletDTO, trx?: Knex.Transaction): Promise<Wallet> {
    const id = generateId();
    const now = new Date();
    const currency = data.currency ?? 'NGN';
    const qb = trx ?? this.db;

    await qb('wallets').insert({
      id,
      user_id: data.userId,
      balance: '0.0000',
      currency,
      created_at: now,
      updated_at: now,
    });

    return { id, userId: data.userId, balance: '0.0000', currency, createdAt: now, updatedAt: now };
  }

  async findById(id: string, trx?: Knex.Transaction): Promise<Wallet | null> {
    const row = await (trx ?? this.db)('wallets').where({ id }).first();
    return (row as Wallet) ?? null;
  }

  async findByUserId(userId: string, trx?: Knex.Transaction): Promise<Wallet | null> {
    const row = await (trx ?? this.db)('wallets').where({ user_id: userId }).first();
    return (row as Wallet) ?? null;
  }

  async findByIdForUpdate(id: string, trx: Knex.Transaction): Promise<Wallet | null> {
    const row = await trx('wallets').where({ id }).forUpdate().first();
    return (row as Wallet) ?? null;
  }

  async debit(id: string, amount: string, trx: Knex.Transaction): Promise<void> {
    await trx('wallets').where({ id }).decrement('balance', parseFloat(amount));
  }

  async credit(id: string, amount: string, trx: Knex.Transaction): Promise<void> {
    await trx('wallets').where({ id }).increment('balance', parseFloat(amount));
  }
}
