import type { Knex } from 'knex';

export interface Wallet {
  id: string;
  userId: string;
  balance: string;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWalletDTO {
  userId: string;
  currency?: string;
}

export interface FundWalletDTO {
  amount: string;
}

export interface WithdrawWalletDTO {
  amount: string;
}

export interface IWalletsService {
  create(data: CreateWalletDTO): Promise<Wallet>;
  getById(id: string, requestingUserId: string): Promise<Wallet>;
  getByUserId(userId: string): Promise<Wallet | null>;
  fund(userId: string, data: FundWalletDTO): Promise<Wallet>;
  withdraw(userId: string, data: WithdrawWalletDTO): Promise<Wallet>;
}

export interface IWalletsRepository {
  create(data: CreateWalletDTO, trx?: Knex.Transaction): Promise<Wallet>;
  findById(id: string, trx?: Knex.Transaction): Promise<Wallet | null>;
  findByUserId(userId: string, trx?: Knex.Transaction): Promise<Wallet | null>;
  /** Acquires a row-level lock — must be called inside a transaction */
  findByIdForUpdate(id: string, trx: Knex.Transaction): Promise<Wallet | null>;
  debit(id: string, amount: string, trx: Knex.Transaction): Promise<void>;
  credit(id: string, amount: string, trx: Knex.Transaction): Promise<void>;
}
