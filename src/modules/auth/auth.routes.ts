import { Router } from 'express';
import { container } from 'tsyringe';
import { validate } from '../../shared/middleware/validation.middleware';
import { loginSchema, registerSchema } from './auth.validator';
import { AuthController } from './auth.controller';

const router = Router();
const controller = container.resolve(AuthController);

router.post('/login', validate(loginSchema), controller.login);
router.post('/register', validate(registerSchema), controller.register);

export default router;
