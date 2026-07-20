import { Router } from 'express';
import { container } from 'tsyringe';
import { authMiddleware } from '../../shared/middleware/auth.middleware';
import { validate } from '../../shared/middleware/validation.middleware';
import { createWalletSchema, fundWalletSchema, withdrawWalletSchema, walletIdSchema } from './wallets.validator';
import { WalletsController } from './wallets.controller';

const router = Router();
const controller = container.resolve(WalletsController);

router.use(authMiddleware);
router.post('/', validate(createWalletSchema), controller.create);
router.post('/fund', validate(fundWalletSchema), controller.fund);
router.post('/withdraw', validate(withdrawWalletSchema), controller.withdraw);
router.get('/me', controller.getMyWallet);
router.get('/:id', validate(walletIdSchema, 'params'), controller.getById);

export default router;
