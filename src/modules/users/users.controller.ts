import type { Request, Response, NextFunction } from 'express';
import { inject, injectable } from 'tsyringe';
import { TOKENS } from '../../shared/utils/constants';
import type { IUsersService } from './users.types';

import { asyncHandler } from '../../shared/utils/asyncHandler';

@injectable()
export class UsersController {
  constructor(@inject(TOKENS.UsersService) private readonly usersService: IUsersService) {}

  getById = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.usersService.getById(req.params.id, req.user!.sub);
    return res.status(200).json({ data: result });
  });
}
