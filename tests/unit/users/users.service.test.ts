import 'reflect-metadata';
import { UsersService } from '../../../src/modules/users/users.service';
import type { IUsersRepository, User } from '../../../src/modules/users/users.types';
import { NotFoundError } from '../../../src/shared/errors/NotFoundError';
import { ForbiddenError } from '../../../src/shared/errors/ForbiddenError';

const existingUser: User = {
  id: 'user-1',
  email: 'test@example.com',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const makeRepository = (overrides: Partial<IUsersRepository> = {}): IUsersRepository => ({
  create: jest.fn().mockResolvedValue(existingUser),
  findById: jest.fn().mockResolvedValue(null),
  findByEmail: jest.fn().mockResolvedValue(null),
  findByEmailWithHash: jest.fn().mockResolvedValue(null),
  ...overrides,
});

describe('UsersService', () => {
  describe('create', () => {
    it('calls repository.create and returns the result', async () => {
      const repo = makeRepository();
      const service = new UsersService(repo);

      const result = await service.create({ email: 'test@example.com', password: 'secret123' });

      expect(repo.create).toHaveBeenCalledWith({ email: 'test@example.com', password: 'secret123' });
      expect(result).toEqual(existingUser);
    });
  });

  describe('getById', () => {
    it('returns the user when found and owned by requesting user', async () => {
      const repo = makeRepository({ findById: jest.fn().mockResolvedValue(existingUser) });
      const service = new UsersService(repo);

      await expect(service.getById('user-1', 'user-1')).resolves.toEqual(existingUser);
    });

    it('throws NotFoundError when user does not exist', async () => {
      const repo = makeRepository({ findById: jest.fn().mockResolvedValue(null) });
      const service = new UsersService(repo);

      await expect(service.getById('missing-id', 'user-1')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('throws ForbiddenError when requesting user does not own the resource', async () => {
      const repo = makeRepository({ findById: jest.fn().mockResolvedValue(existingUser) });
      const service = new UsersService(repo);

      await expect(service.getById('user-1', 'other-user')).rejects.toBeInstanceOf(ForbiddenError);
    });
  });
});
