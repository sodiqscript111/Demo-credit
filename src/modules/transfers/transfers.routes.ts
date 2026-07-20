import { Router } from "express";
import { container } from "tsyringe";
import { authMiddleware } from "../../shared/middleware/auth.middleware";
import { requireIdempotencyKey } from "../../shared/middleware/idempotency.middleware";
import { validate } from "../../shared/middleware/validation.middleware";
import { createTransferSchema, transferIdSchema } from "./transfers.validator";
import { TransfersController } from "./transfers.controller";

const router = Router();
const controller = container.resolve(TransfersController);

router.use(authMiddleware);
router.post(
  "/",
  requireIdempotencyKey,
  validate(createTransferSchema),
  controller.create,
);
router.get("/:id", validate(transferIdSchema, "params"), controller.getById);

export default router;
