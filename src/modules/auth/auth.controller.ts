import type { Request, Response, NextFunction } from 'express';
import { inject, injectable } from 'tsyringe';
import { TOKENS } from '../../shared/utils/constants';
import type { IAuthService } from './auth.types';

import { asyncHandler } from '../../shared/utils/asyncHandler';

@injectable()
export class AuthController {
  constructor(@inject(TOKENS.AuthService) private readonly authService: IAuthService) {}

  login = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.authService.login(req.body);
    return res.status(200).json({ data: result });
  });

  register = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.authService.register(req.body);
    return res.status(201).json({ data: result });
  });
}
