import type { Knex } from 'knex';

export interface User {
  id: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserWithHash extends User {
  passwordHash: string;
}

export interface CreateUserDTO {
  email: string;
  password: string; // raw value; caller must hash before passing
}

export interface IUsersService {
  create(data: CreateUserDTO): Promise<User>;
  getById(id: string, requestingUserId: string): Promise<User>;
}

export interface IUsersRepository {
  create(data: CreateUserDTO, trx?: Knex.Transaction): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByEmail(id: string): Promise<User | null>;
  /** Returns the full row including password_hash — only for auth use */
  findByEmailWithHash(email: string): Promise<UserWithHash | null>;
}
