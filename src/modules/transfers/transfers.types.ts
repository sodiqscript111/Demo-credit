import type { Knex } from 'knex';

export interface Transfer {
  id: string;
  fromWalletId: string;
  toWalletId: string;
  amount: string;
  status: 'pending' | 'completed' | 'failed';
  idempotencyKey: string;
  createdAt: Date;
}

export interface CreateTransferDTO {
  fromWalletId: string;
  toWalletId: string;
  amount: string;
  idempotencyKey: string;
}

export interface ITransfersService {
  create(data: CreateTransferDTO, requestingUserId: string): Promise<Transfer>;
  getById(id: string, requestingUserId: string): Promise<Transfer>;
}

export interface ITransfersRepository {
  create(data: CreateTransferDTO, trx: Knex.Transaction): Promise<Transfer>;
  findById(id: string): Promise<Transfer | null>;
  findByIdempotencyKey(key: string): Promise<Transfer | null>;
}
