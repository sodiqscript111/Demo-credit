import type { Request, Response, NextFunction } from 'express';
import { inject, injectable } from 'tsyringe';
import { TOKENS } from '../../shared/utils/constants';
import type { ILedgerService, LedgerQueryDTO } from './ledger.types';

import { asyncHandler } from '../../shared/utils/asyncHandler';

@injectable()
export class LedgerController {
  constructor(@inject(TOKENS.LedgerService) private readonly ledgerService: ILedgerService) {}

  list = asyncHandler(async (req: Request, res: Response) => {
    const query: LedgerQueryDTO = {
      walletId: req.query.walletId as string,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    };
    const result = await this.ledgerService.listEntries(query, req.user!.sub);
    return res.status(200).json({ data: result });
  });
}
