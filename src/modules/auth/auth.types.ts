import type { User } from "../users/users.types";
import type { Wallet } from "../wallets/wallets.types";
import type { AuthPayload } from "../../shared/types/common";

export type { AuthPayload };

export interface AuthResponse {
  accessToken: string;
  user: Pick<User, "id" | "email">;
  wallet?: Pick<Wallet, "id" | "balance" | "currency">;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface RegisterDTO {
  email: string;
  password: string;
}

export interface IAuthService {
  login(data: LoginDTO): Promise<AuthResponse>;
  register(data: RegisterDTO): Promise<AuthResponse>;
}
