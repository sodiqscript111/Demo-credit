import pinoHttp from "pino-http";
import { logger } from "../utils/logger";

export const loggerMiddleware = () => pinoHttp({ logger: logger as any });
