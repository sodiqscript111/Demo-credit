import type { Request, Response, NextFunction } from 'express';
import { inject, injectable } from 'tsyringe';
import { TOKENS } from '../../shared/utils/constants';
import { NotFoundError } from '../../shared/errors/NotFoundError';
import type { IWalletsService } from './wallets.types';

import { asyncHandler } from '../../shared/utils/asyncHandler';

@injectable()
export class WalletsController {
  constructor(@inject(TOKENS.WalletsService) private readonly walletsService: IWalletsService) {}

  create = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.walletsService.create({
      userId: req.user!.sub,
      currency: req.body.currency,
    });
    return res.status(201).json({ data: result });
  });

  getMyWallet = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.walletsService.getByUserId(req.user!.sub);
    if (!result) throw new NotFoundError('No wallet found for this user');
    return res.status(200).json({ data: result });
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.walletsService.getById(req.params.id, req.user!.sub);
    return res.status(200).json({ data: result });
  });

  fund = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.walletsService.fund(req.user!.sub, {
      amount: req.body.amount,
    });
    return res.status(200).json({ data: result });
  });

  withdraw = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.walletsService.withdraw(req.user!.sub, {
      amount: req.body.amount,
    });
    return res.status(200).json({ data: result });
  });
}
