import { Router } from "express";
import { container } from "tsyringe";
import { authMiddleware } from "../../shared/middleware/auth.middleware";
import { validate } from "../../shared/middleware/validation.middleware";
import { ledgerQuerySchema } from "./ledger.validator";
import { LedgerController } from "./ledger.controller";

const router = Router();
const controller = container.resolve(LedgerController);

router.use(authMiddleware);
router.get("/", validate(ledgerQuerySchema, "query"), controller.list);

export default router;
