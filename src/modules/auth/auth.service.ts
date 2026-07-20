import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { inject, injectable } from 'tsyringe';
import type { Knex } from 'knex';
import env from '../../config/env';
import { logger } from '../../shared/utils/logger';
import { TOKENS } from '../../shared/utils/constants';
import { ConflictError } from '../../shared/errors/ConflictError';
import { UnauthorizedError } from '../../shared/errors/UnauthorizedError';
import type { IAdjutorService } from '../adjutor/adjutor.types';
import type { IUsersRepository } from '../users/users.types';
import type { IWalletsRepository } from '../wallets/wallets.types';
import type {
  AuthPayload,
  AuthResponse,
  IAuthService,
  LoginDTO,
  RegisterDTO,
} from './auth.types';

const BCRYPT_ROUNDS = 12;

@injectable()
export class AuthService implements IAuthService {
  constructor(
    @inject(TOKENS.Database)           private readonly db: Knex,
    @inject(TOKENS.AdjutorService)     private readonly adjutorService: IAdjutorService,
    @inject(TOKENS.UsersRepository)    private readonly usersRepository: IUsersRepository,
    @inject(TOKENS.WalletsRepository)  private readonly walletsRepository: IWalletsRepository,
  ) {}

  // ── Register ────────────────────────────────────────────────────────────────
  async register(data: RegisterDTO): Promise<AuthResponse> {
    // 1. Karma blacklist check — fail closed
    const isBlacklisted = await this.adjutorService.isBlacklisted(data.email);
    if (isBlacklisted) {
      logger.warn({ email: data.email }, 'Registration blocked: Karma blacklist hit');
      throw new ConflictError(
        'We are unable to create an account for you at this time.',
        'BLACKLISTED_IDENTITY',
      );
    }

    // 2. Duplicate email check
    const existing = await this.usersRepository.findByEmail(data.email);
    if (existing) {
      throw new ConflictError('An account with this email already exists.', 'EMAIL_TAKEN');
    }

    // 3. Hash password
    const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

    // 4. Atomically create user + wallet
    const { user, wallet } = await this.db.transaction(async (trx) => {
      const user = await this.usersRepository.create(
        { email: data.email, password: passwordHash },
        trx,
      );
      const wallet = await this.walletsRepository.create({ userId: user.id }, trx);
      return { user, wallet };
    });

    logger.info({ userId: user.id }, 'Registration successful');

    // 5. Issue token
    const accessToken = this.signToken({ sub: user.id, email: user.email });

    return {
      accessToken,
      user:   { id: user.id,     email: user.email },
      wallet: { id: wallet.id,   balance: wallet.balance, currency: wallet.currency },
    };
  }

  // ── Login ───────────────────────────────────────────────────────────────────
  async login(data: LoginDTO): Promise<AuthResponse> {
    // 1. Find user with password hash
    const userRow = await this.usersRepository.findByEmailWithHash(data.email);

    // Use the same error for "not found" and "wrong password" — avoid user enumeration
    const invalidCredentials = new UnauthorizedError('Invalid email or password', 'INVALID_CREDENTIALS');

    if (!userRow) throw invalidCredentials;

    // 2. Verify password
    const passwordValid = await bcrypt.compare(data.password, userRow.passwordHash);
    if (!passwordValid) throw invalidCredentials;

    logger.info({ userId: userRow.id }, 'Login successful');

    // 3. Issue token
    const accessToken = this.signToken({ sub: userRow.id, email: userRow.email });

    return {
      accessToken,
      user: { id: userRow.id, email: userRow.email },
    };
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────
  private signToken(payload: AuthPayload): string {
    return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] });
  }
}
