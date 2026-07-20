import type { Request, Response, NextFunction } from 'express';
import { inject, injectable } from 'tsyringe';
import { TOKENS } from '../../shared/utils/constants';
import type { ITransfersService } from './transfers.types';

import { asyncHandler } from '../../shared/utils/asyncHandler';

@injectable()
export class TransfersController {
  constructor(@inject(TOKENS.TransfersService) private readonly transfersService: ITransfersService) {}

  create = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.transfersService.create(
      { ...req.body, idempotencyKey: req.idempotencyKey as string },
      req.user!.sub,
    );
    return res.status(201).json({ data: result });
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.transfersService.getById(req.params.id, req.user!.sub);
    return res.status(200).json({ data: result });
  });
}
