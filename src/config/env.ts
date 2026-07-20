import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().default(3000),
  LOG_LEVEL: z.string().default("info"),

  DB_HOST: z.string().default("127.0.0.1"),
  DB_PORT: z.coerce.number().default(3306),
  DB_USER: z.string().default("root"),
  DB_PASSWORD: z.string().default(""),
  DB_NAME: z.string().default("democredit"),

  JWT_SECRET: z.string().min(1),
  JWT_EXPIRES_IN: z.string().default("7d"),
  CORS_ORIGIN: z.string().default("*"),

  ADJUTOR_API_KEY: z.string().min(1),
  ADJUTOR_BASE_URL: z.string().url().default("https://adjutor.lendsqr.com/v2"),
});

const env = envSchema.parse(process.env);

export type Env = z.infer<typeof envSchema>;
export default env;
