import type { Knex } from 'knex';

export interface LedgerEntry {
  id: string;
  walletId: string;
  transferId: string | null;
  amount: string;
  type: 'credit' | 'debit';
  reference: string | null;
  createdAt: Date;
}

export interface CreateLedgerEntryDTO {
  walletId: string;
  transferId: string | null;
  amount: string;
  type: 'credit' | 'debit';
  reference?: string;
}

export interface LedgerQueryDTO {
  walletId: string;
  page?: number;
  limit?: number;
}

export interface ILedgerService {
  listEntries(query: LedgerQueryDTO, requestingUserId: string): Promise<LedgerEntry[]>;
}

export interface ILedgerRepository {
  listByWalletId(query: LedgerQueryDTO): Promise<LedgerEntry[]>;
  create(entry: CreateLedgerEntryDTO, trx: Knex.Transaction): Promise<LedgerEntry>;
}
