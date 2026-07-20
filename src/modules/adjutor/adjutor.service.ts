import { injectable } from "tsyringe";
import env from "../../config/env";
import { logger } from "../../shared/utils/logger";
import { AppError } from "../../shared/errors/AppError";
import { withRetry } from "../../shared/utils/retry";
import type { IAdjutorService, KarmaApiResponse } from "./adjutor.types";

const KARMA_RETRY_DELAYS_MS = [2_000, 3_000];

@injectable()
export class AdjutorService implements IAdjutorService {
  private readonly baseUrl = env.ADJUTOR_BASE_URL;

  private get authHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${env.ADJUTOR_API_KEY}`,
      "Content-Type": "application/json",
    };
  }

  async isBlacklisted(identity: string): Promise<boolean> {
    const url = `${this.baseUrl}/verification/karma/${encodeURIComponent(identity)}`;

    logger.info({ identity }, "Adjutor: checking Karma blacklist");

    let response: Response;

    try {
      response = await withRetry(() => this.fetchKarma(url), {
        delays: KARMA_RETRY_DELAYS_MS,
        onRetry: (attempt, err) => {
          logger.warn(
            { attempt, err, identity },
            "Adjutor: transient failure — retrying Karma check",
          );
        },
      });
    } catch (err) {
      logger.error(
        { err, identity },
        "Adjutor: all Karma check attempts failed",
      );
      throw new AppError(
        "Blacklist verification service is unavailable. Please try again later.",
        503,
        "ADJUTOR_UNAVAILABLE",
      );
    }

    if (response.status === 404) {
      logger.info({ identity }, "Adjutor: identity not found in Karma — clean");
      return false;
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      logger.error(
        { identity, status: response.status, body },
        "Adjutor: unexpected error",
      );
      throw new AppError(
        "Blacklist verification failed. Please try again later.",
        503,
        "ADJUTOR_ERROR",
      );
    }

    const payload = (await response.json()) as KarmaApiResponse;

    logger.info(
      { identity, blacklisted: payload.data != null, cost: payload.meta?.cost },
      "Adjutor: Karma check complete",
    );

    return payload.data != null;
  }

  private async fetchKarma(url: string): Promise<Response> {
    let response: Response;

    try {
      response = await fetch(url, {
        method: "GET",
        headers: this.authHeaders,
      });
    } catch (err) {
      throw err;
    }

    if (response.status >= 500) {
      throw new Error(`Adjutor server error: ${response.status}`);
    }

    return response;
  }
}
