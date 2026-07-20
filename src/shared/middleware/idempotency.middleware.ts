import type { Request, Response, NextFunction } from "express";
import { ValidationError } from "../errors/ValidationError";
import { IDEMPOTENCY_KEY_HEADER } from "../utils/constants";

export const requireIdempotencyKey = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const key = req.header(IDEMPOTENCY_KEY_HEADER);
  if (!key) {
    return next(new ValidationError("Missing Idempotency-Key header"));
  }

  req.idempotencyKey = key;
  next();
};
