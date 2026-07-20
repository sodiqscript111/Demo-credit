import { injectable } from 'tsyringe';
import env from '../../config/env';
import { logger } from '../../shared/utils/logger';
import { AppError } from '../../shared/errors/AppError';
import { withRetry } from '../../shared/utils/retry';
import type { IAdjutorService, KarmaApiResponse } from './adjutor.types';

/**
 * 3 total attempts: immediate → wait 2 s → wait 3 s → stop.
 * Only transient failures (network errors, 5xx) are retried.
 */
const KARMA_RETRY_DELAYS_MS = [2_000, 3_000];

@injectable()
export class AdjutorService implements IAdjutorService {
  private readonly baseUrl = env.ADJUTOR_BASE_URL;

  private get authHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${env.ADJUTOR_API_KEY}`,
      'Content-Type': 'application/json',
    };
  }

  async isBlacklisted(identity: string): Promise<boolean> {
    const url = `${this.baseUrl}/verification/karma/${encodeURIComponent(identity)}`;

    logger.info({ identity }, 'Adjutor: checking Karma blacklist');

    let response: Response;

    try {
      response = await withRetry(
        () => this.fetchKarma(url),
        {
          delays: KARMA_RETRY_DELAYS_MS,
          onRetry: (attempt, err) => {
            logger.warn(
              { attempt, err, identity },
              'Adjutor: transient failure — retrying Karma check',
            );
          },
        },
      );
    } catch (err) {
      logger.error({ err, identity }, 'Adjutor: all Karma check attempts failed');
      throw new AppError(
        'Blacklist verification service is unavailable. Please try again later.',
        503,
        'ADJUTOR_UNAVAILABLE',
      );
    }

    // 404 → identity not in the blacklist (clean)
    if (response.status === 404) {
      logger.info({ identity }, 'Adjutor: identity not found in Karma — clean');
      return false;
    }

    // Any remaining non-OK status is unexpected and non-retryable at this point
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      logger.error({ identity, status: response.status, body }, 'Adjutor: unexpected error');
      throw new AppError(
        'Blacklist verification failed. Please try again later.',
        503,
        'ADJUTOR_ERROR',
      );
    }

    const payload = (await response.json()) as KarmaApiResponse;

    logger.info(
      { identity, blacklisted: payload.data != null, cost: payload.meta?.cost },
      'Adjutor: Karma check complete',
    );

    // data exists → identity exists in the Karma blacklist
    return payload.data != null;
  }

  /**
   * Makes the HTTP request and throws on transient failures only.
   * Non-retryable statuses (4xx) are returned as-is for the caller to handle.
   */
  private async fetchKarma(url: string): Promise<Response> {
    let response: Response;

    try {
      response = await fetch(url, {
        method: 'GET',
        headers: this.authHeaders,
      });
    } catch (err) {
      // Network-level failure (DNS, timeout, ECONNREFUSED…) — always retryable
      throw err;
    }

    // 5xx server errors are transient — throw so withRetry can catch and retry
    if (response.status >= 500) {
      throw new Error(`Adjutor server error: ${response.status}`);
    }

    // Everything else (200, 404, 401, 429…) is returned for the caller to interpret
    return response;
  }
}
