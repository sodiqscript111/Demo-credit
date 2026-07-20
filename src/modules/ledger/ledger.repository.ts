import { inject, injectable } from "tsyringe";
import type { Knex } from "knex";
import { TOKENS } from "../../shared/utils/constants";
import { generateId } from "../../shared/utils/uuid";
import { normalizePagination } from "../../shared/utils/pagination";
import type {
  CreateLedgerEntryDTO,
  ILedgerRepository,
  LedgerEntry,
  LedgerQueryDTO,
} from "./ledger.types";

@injectable()
export class LedgerRepository implements ILedgerRepository {
  constructor(@inject(TOKENS.Database) private readonly db: Knex) {}

  async listByWalletId(query: LedgerQueryDTO): Promise<LedgerEntry[]> {
    const { limit, offset } = normalizePagination(query);

    return this.db<LedgerEntry>("ledger_entries")
      .where("wallet_id", query.walletId)
      .orderBy("created_at", "desc")
      .limit(limit)
      .offset(offset);
  }

  async create(
    entry: CreateLedgerEntryDTO,
    trx: Knex.Transaction,
  ): Promise<LedgerEntry> {
    const id = generateId();
    const createdAt = new Date();

    await trx("ledger_entries").insert({
      id,
      wallet_id: entry.walletId,
      transfer_id: entry.transferId,
      amount: entry.amount,
      type: entry.type,
      reference: entry.reference ?? null,
      created_at: createdAt,
    });

    return {
      id,
      walletId: entry.walletId,
      transferId: entry.transferId,
      amount: entry.amount,
      type: entry.type,
      reference: entry.reference ?? null,
      createdAt,
    };
  }
}
