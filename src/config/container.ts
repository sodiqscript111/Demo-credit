import { container } from "tsyringe";
import { TOKENS } from "../shared/utils/constants";
import db from "./database";

import { AdjutorService } from "../modules/adjutor/adjutor.service";
import type { IAdjutorService } from "../modules/adjutor/adjutor.types";

import { AuthController } from "../modules/auth/auth.controller";
import { AuthService } from "../modules/auth/auth.service";
import type { IAuthService } from "../modules/auth/auth.types";

import { UsersController } from "../modules/users/users.controller";
import { UsersService } from "../modules/users/users.service";
import { UsersRepository } from "../modules/users/users.repository";
import type {
  IUsersRepository,
  IUsersService,
} from "../modules/users/users.types";

import { WalletsController } from "../modules/wallets/wallets.controller";
import { WalletsService } from "../modules/wallets/wallets.service";
import { WalletsRepository } from "../modules/wallets/wallets.repository";
import type {
  IWalletsRepository,
  IWalletsService,
} from "../modules/wallets/wallets.types";

import { LedgerController } from "../modules/ledger/ledger.controller";
import { LedgerService } from "../modules/ledger/ledger.service";
import { LedgerRepository } from "../modules/ledger/ledger.repository";
import type {
  ILedgerRepository,
  ILedgerService,
} from "../modules/ledger/ledger.types";

import { TransfersController } from "../modules/transfers/transfers.controller";
import { TransfersService } from "../modules/transfers/transfers.service";
import { TransfersRepository } from "../modules/transfers/transfers.repository";
import type {
  ITransfersRepository,
  ITransfersService,
} from "../modules/transfers/transfers.types";

container.register(TOKENS.Database, { useValue: db });

container.register<IAdjutorService>(TOKENS.AdjutorService, {
  useClass: AdjutorService,
});

container.register<IUsersRepository>(TOKENS.UsersRepository, {
  useClass: UsersRepository,
});
container.register<IUsersService>(TOKENS.UsersService, {
  useClass: UsersService,
});
container.register(UsersController, { useClass: UsersController });

container.register<IWalletsRepository>(TOKENS.WalletsRepository, {
  useClass: WalletsRepository,
});
container.register<IWalletsService>(TOKENS.WalletsService, {
  useClass: WalletsService,
});
container.register(WalletsController, { useClass: WalletsController });

container.register<ILedgerRepository>(TOKENS.LedgerRepository, {
  useClass: LedgerRepository,
});
container.register<ILedgerService>(TOKENS.LedgerService, {
  useClass: LedgerService,
});
container.register(LedgerController, { useClass: LedgerController });

container.register<ITransfersRepository>(TOKENS.TransfersRepository, {
  useClass: TransfersRepository,
});
container.register<ITransfersService>(TOKENS.TransfersService, {
  useClass: TransfersService,
});
container.register(TransfersController, { useClass: TransfersController });

container.register<IAuthService>(TOKENS.AuthService, { useClass: AuthService });
container.register(AuthController, { useClass: AuthController });

export { container };
