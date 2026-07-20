import { inject, injectable } from "tsyringe";
import { TOKENS } from "../../shared/utils/constants";
import { NotFoundError } from "../../shared/errors/NotFoundError";
import { ForbiddenError } from "../../shared/errors/ForbiddenError";
import type { IWalletsRepository } from "../wallets/wallets.types";
import type {
  ILedgerRepository,
  ILedgerService,
  LedgerEntry,
  LedgerQueryDTO,
} from "./ledger.types";

@injectable()
export class LedgerService implements ILedgerService {
  constructor(
    @inject(TOKENS.LedgerRepository)
    private readonly ledgerRepository: ILedgerRepository,
    @inject(TOKENS.WalletsRepository)
    private readonly walletsRepository: IWalletsRepository,
  ) {}

  async listEntries(
    query: LedgerQueryDTO,
    requestingUserId: string,
  ): Promise<LedgerEntry[]> {
    const wallet = await this.walletsRepository.findById(query.walletId);
    if (!wallet) throw new NotFoundError("Wallet not found");
    if (wallet.userId !== requestingUserId)
      throw new ForbiddenError("You do not have access to this wallet");
    return this.ledgerRepository.listByWalletId(query);
  }
}
