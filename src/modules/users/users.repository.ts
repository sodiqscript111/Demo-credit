import { inject, injectable } from 'tsyringe';
import type { Knex } from 'knex';
import { TOKENS } from '../../shared/utils/constants';
import { generateId } from '../../shared/utils/uuid';
import type { CreateUserDTO, IUsersRepository, User, UserWithHash } from './users.types';

@injectable()
export class UsersRepository implements IUsersRepository {
  constructor(@inject(TOKENS.Database) private readonly db: Knex) {}

  async create(data: CreateUserDTO, trx?: Knex.Transaction): Promise<User> {
    const id = generateId();
    const now = new Date();
    const qb = trx ?? this.db;

    await qb('users').insert({
      id,
      email: data.email,
      password_hash: data.password,
      created_at: now,
      updated_at: now,
    });

    return { id, email: data.email, createdAt: now, updatedAt: now };
  }

  async findById(id: string): Promise<User | null> {
    const row = await this.db('users')
      .select('id', 'email', 'created_at', 'updated_at')
      .where({ id })
      .first();
    return (row as User) ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.db('users')
      .select('id', 'email', 'created_at', 'updated_at')
      .where({ email })
      .first();
    return (row as User) ?? null;
  }

  async findByEmailWithHash(email: string): Promise<UserWithHash | null> {
    const row = await this.db('users')
      .select('id', 'email', 'password_hash', 'created_at', 'updated_at')
      .where({ email })
      .first();
    return (row as UserWithHash) ?? null;
  }
}
