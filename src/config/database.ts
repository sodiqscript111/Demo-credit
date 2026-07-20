import knex, { Knex } from "knex";
import env from "./env";
import { postProcessResponse } from "../shared/utils/case";

export const createKnexConfig = (
  overrides: Partial<Knex.Config> = {},
): Knex.Config => ({
  client: "mysql2",
  connection: {
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
  },
  pool: { min: 2, max: 10 },
  migrations: {
    directory: "src/database/migrations",
    extension: "ts",
  },
  seeds: {
    directory: "src/database/seeds",
    extension: "ts",
  },
  postProcessResponse,
  ...overrides,
});

const db = knex(createKnexConfig());

export default db;
