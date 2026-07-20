import type { AuthPayload } from "./common";

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
      idempotencyKey?: string;
    }
  }
}

export {};
