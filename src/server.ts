import 'reflect-metadata';
import dotenv from 'dotenv';

dotenv.config();

import './config/container';
import app from './app';
import db from './config/database';
import env from './config/env';
import { logger } from './shared/utils/logger';

const SHUTDOWN_TIMEOUT_MS = 10_000;

const boot = async (): Promise<void> => {
  // ── 1. Verify database is reachable before accepting traffic ─────────────────
  try {
    await db.raw('SELECT 1');
    logger.info('Database connection verified');
  } catch (err) {
    logger.fatal({ err }, 'Cannot connect to database — aborting startup');
    process.exit(1);
  }

  // ── 2. Start HTTP server ─────────────────────────────────────────────────────
  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV }, 'Server started');
  });

  // ── 3. Graceful shutdown ─────────────────────────────────────────────────────
  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'Shutdown signal received — starting graceful shutdown');

    const forceExit = setTimeout(() => {
      logger.error('Graceful shutdown timed out — forcing exit');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS).unref();

    server.close(async () => {
      logger.info('HTTP server closed');

      try {
        await db.destroy();
        logger.info('Database connection pool destroyed');
      } catch (err) {
        logger.error({ err }, 'Error destroying database pool');
      }

      clearTimeout(forceExit);
      logger.info('Graceful shutdown complete');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
};

// ── 4. Safety nets ─────────────────────────────────────────────────────────────
process.on('uncaughtException', (err: Error) => {
  logger.fatal({ err }, 'Uncaught exception — exiting');
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
  logger.fatal({ reason }, 'Unhandled promise rejection — exiting');
  process.exit(1);
});

boot();
