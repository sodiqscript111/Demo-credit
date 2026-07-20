import { inject, injectable } from 'tsyringe';
import { NotFoundError } from '../../shared/errors/NotFoundError';
import { ForbiddenError } from '../../shared/errors/ForbiddenError';
import { TOKENS } from '../../shared/utils/constants';
import type { CreateUserDTO, IUsersRepository, IUsersService, User } from './users.types';

@injectable()
export class UsersService implements IUsersService {
  constructor(@inject(TOKENS.UsersRepository) private readonly usersRepository: IUsersRepository) {}

  async create(data: CreateUserDTO): Promise<User> {
    return this.usersRepository.create(data);
  }

  async getById(id: string, requestingUserId: string): Promise<User> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    if (user.id !== requestingUserId) {
      throw new ForbiddenError('You do not have access to this user');
    }
    return user;
  }
}
