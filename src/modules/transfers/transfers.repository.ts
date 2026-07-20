import { inject, injectable } from "tsyringe";
import type { Knex } from "knex";
import { TOKENS } from "../../shared/utils/constants";
import { generateId } from "../../shared/utils/uuid";
import type {
  CreateTransferDTO,
  ITransfersRepository,
  Transfer,
} from "./transfers.types";

@injectable()
export class TransfersRepository implements ITransfersRepository {
  constructor(@inject(TOKENS.Database) private readonly db: Knex) {}

  async create(
    data: CreateTransferDTO,
    trx: Knex.Transaction,
  ): Promise<Transfer> {
    const id = generateId();
    const createdAt = new Date();

    await trx("transfers").insert({
      id,
      from_wallet_id: data.fromWalletId,
      to_wallet_id: data.toWalletId,
      amount: data.amount,
      status: "completed",
      idempotency_key: data.idempotencyKey,
      created_at: createdAt,
    });

    return {
      id,
      fromWalletId: data.fromWalletId,
      toWalletId: data.toWalletId,
      amount: data.amount,
      status: "completed",
      idempotencyKey: data.idempotencyKey,
      createdAt,
    };
  }

  async findById(id: string): Promise<Transfer | null> {
    const row = await this.db("transfers").where({ id }).first();
    return (row as Transfer) ?? null;
  }

  async findByIdempotencyKey(key: string): Promise<Transfer | null> {
    const row = await this.db("transfers")
      .where({ idempotency_key: key })
      .first();
    return (row as Transfer) ?? null;
  }
}
