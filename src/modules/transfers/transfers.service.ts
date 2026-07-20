import { inject, injectable } from "tsyringe";
import type { Knex } from "knex";
import { TOKENS } from "../../shared/utils/constants";
import { logger } from "../../shared/utils/logger";
import { NotFoundError } from "../../shared/errors/NotFoundError";
import { ForbiddenError } from "../../shared/errors/ForbiddenError";
import { ValidationError } from "../../shared/errors/ValidationError";
import { InsufficientFundsError } from "../../shared/errors/InsufficientFundsError";
import type { IWalletsRepository } from "../wallets/wallets.types";
import type { ILedgerRepository } from "../ledger/ledger.types";
import type {
  CreateTransferDTO,
  ITransfersRepository,
  ITransfersService,
  Transfer,
} from "./transfers.types";

@injectable()
export class TransfersService implements ITransfersService {
  constructor(
    @inject(TOKENS.Database) private readonly db: Knex,
    @inject(TOKENS.TransfersRepository)
    private readonly transfersRepository: ITransfersRepository,
    @inject(TOKENS.WalletsRepository)
    private readonly walletsRepository: IWalletsRepository,
    @inject(TOKENS.LedgerRepository)
    private readonly ledgerRepository: ILedgerRepository,
  ) {}

  async create(
    data: CreateTransferDTO,
    requestingUserId: string,
  ): Promise<Transfer> {
    const existing = await this.transfersRepository.findByIdempotencyKey(
      data.idempotencyKey,
    );
    if (existing) {
      logger.info(
        { idempotencyKey: data.idempotencyKey },
        "Transfer: idempotent replay — returning existing",
      );
      return existing;
    }

    if (data.fromWalletId === data.toWalletId) {
      throw new ValidationError(
        "Source and destination wallets must be different",
      );
    }

    const amount = parseFloat(data.amount);
    if (isNaN(amount) || amount <= 0) {
      throw new ValidationError("Amount must be a positive number");
    }

    return this.db.transaction(async (trx: Knex.Transaction) => {
      const [firstId, secondId] = [data.fromWalletId, data.toWalletId].sort();

      const firstWallet = await this.walletsRepository.findByIdForUpdate(
        firstId,
        trx,
      );
      const secondWallet = await this.walletsRepository.findByIdForUpdate(
        secondId,
        trx,
      );

      if (!firstWallet) throw new NotFoundError("Wallet not found");
      if (!secondWallet) throw new NotFoundError("Wallet not found");

      const fromWallet =
        firstId === data.fromWalletId ? firstWallet : secondWallet;
      const toWallet = firstId === data.toWalletId ? firstWallet : secondWallet;

      if (fromWallet.userId !== requestingUserId) {
        throw new ForbiddenError("You can only transfer from your own wallet");
      }

      if (parseFloat(fromWallet.balance) < amount) {
        throw new InsufficientFundsError();
      }

      logger.info(
        {
          fromWalletId: data.fromWalletId,
          toWalletId: data.toWalletId,
          amount,
        },
        "Transfer: locks acquired — executing debit/credit",
      );

      await this.walletsRepository.debit(fromWallet.id, data.amount, trx);
      await this.walletsRepository.credit(toWallet.id, data.amount, trx);

      const transfer = await this.transfersRepository.create(data, trx);

      await this.ledgerRepository.create(
        {
          walletId: fromWallet.id,
          transferId: transfer.id,
          amount: data.amount,
          type: "debit",
          reference: data.idempotencyKey,
        },
        trx,
      );
      await this.ledgerRepository.create(
        {
          walletId: toWallet.id,
          transferId: transfer.id,
          amount: data.amount,
          type: "credit",
          reference: data.idempotencyKey,
        },
        trx,
      );

      logger.info(
        { transferId: transfer.id },
        "Transfer: committed successfully",
      );
      return transfer;
    });
  }

  async getById(id: string, requestingUserId: string): Promise<Transfer> {
    const transfer = await this.transfersRepository.findById(id);
    if (!transfer) throw new NotFoundError("Transfer not found");

    const fromWallet = await this.walletsRepository.findById(
      transfer.fromWalletId,
    );
    if (fromWallet && fromWallet.userId === requestingUserId) return transfer;

    const toWallet = await this.walletsRepository.findById(transfer.toWalletId);
    if (toWallet && toWallet.userId === requestingUserId) return transfer;

    throw new ForbiddenError("You do not have access to this transfer");
  }
}
