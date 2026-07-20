import { Router } from 'express';
import { container } from 'tsyringe';
import { validate } from '../../shared/middleware/validation.middleware';
import { authMiddleware } from '../../shared/middleware/auth.middleware';
import { createUserSchema, userIdSchema } from './users.validator';
import { UsersController } from './users.controller';

const router = Router();
const controller = container.resolve(UsersController);

router.get('/:id', authMiddleware, validate(userIdSchema, 'params'), controller.getById);

export default router;
