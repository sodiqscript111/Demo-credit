import 'reflect-metadata';

jest.mock('../../../src/config/env', () => ({
  __esModule: true,
  default: {
    ADJUTOR_API_KEY: 'test_api_key',
    ADJUTOR_BASE_URL: 'https://adjutor.lendsqr.com/v2',
    LOG_LEVEL: 'silent',
    NODE_ENV: 'test',
  },
}));

jest.mock('../../../src/shared/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// Remove real sleep delays so retry tests complete instantly
jest.mock('../../../src/shared/utils/retry', () => {
  const actual = jest.requireActual<typeof import('../../../src/shared/utils/retry')>(
    '../../../src/shared/utils/retry',
  );
  return {
    ...actual,
    // Override only the module-internal sleep by monkey-patching withRetry
    // to pass a zero-delay variant — we re-export withRetry but swap sleep
  };
});

// Fastest approach: mock setTimeout globally to resolve immediately
jest.spyOn(global, 'setTimeout').mockImplementation((fn: Parameters<typeof setTimeout>[0]) => {
  if (typeof fn === 'function') fn();
  return 0 as unknown as ReturnType<typeof setTimeout>;
});

import { AdjutorService } from '../../../src/modules/adjutor/adjutor.service';

const mockFetch = jest.fn();
global.fetch = mockFetch;

// ─── helpers ────────────────────────────────────────────────────────────────

const karmaResponse = (blacklisted: boolean) => ({
  status: 'success',
  message: 'Successful',
  data: blacklisted
    ? {
        karma_identity: 'bad@actor.com',
        amount_in_contention: '50000.00',
        reason: 'Loan fraud',
        default_date: '2022-11-01',
        karma_type: { karma: 'Loan Default' },
        karma_identity_type: { identity_type: 'Email' },
        reporting_entity: { name: 'SomeLender', email: 'support@somelender.ng' },
      }
    : null,
  meta: { cost: 10, balance: 1590 },
});

const okResponse = (blacklisted: boolean) => ({
  ok: true,
  status: 200,
  json: async () => karmaResponse(blacklisted),
});

const statusResponse = (status: number) => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => `Error ${status}`,
});

// ─── tests ──────────────────────────────────────────────────────────────────

describe('AdjutorService', () => {
  let service: AdjutorService;

  beforeEach(() => {
    service = new AdjutorService();
    mockFetch.mockReset();
  });

  // ── happy path ─────────────────────────────────────────────────────────────

  describe('isBlacklisted — happy path', () => {
    it('returns true when identity IS in the Karma blacklist', async () => {
      mockFetch.mockResolvedValueOnce(okResponse(true));
      await expect(service.isBlacklisted('bad@actor.com')).resolves.toBe(true);
    });

    it('returns false when identity is NOT in the Karma blacklist (data: null)', async () => {
      mockFetch.mockResolvedValueOnce(okResponse(false));
      await expect(service.isBlacklisted('clean@user.com')).resolves.toBe(false);
    });

    it('returns false when Adjutor responds 404 (identity not found)', async () => {
      mockFetch.mockResolvedValueOnce(statusResponse(404));
      await expect(service.isBlacklisted('unknown@user.com')).resolves.toBe(false);
    });
  });

  // ── request shape ──────────────────────────────────────────────────────────

  describe('request shape', () => {
    it('URI-encodes special characters in the identity', async () => {
      mockFetch.mockResolvedValueOnce(okResponse(false));
      await service.isBlacklisted('test+user@example.com');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('test%2Buser%40example.com'),
        expect.any(Object),
      );
    });

    it('sends the Authorization Bearer header', async () => {
      mockFetch.mockResolvedValueOnce(okResponse(false));
      await service.isBlacklisted('user@example.com');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test_api_key',
          }),
        }),
      );
    });
  });

  // ── retry — transient failures ─────────────────────────────────────────────

  describe('retry behaviour', () => {
    it('retries once on a 500 error, succeeds on second attempt', async () => {
      mockFetch
        .mockResolvedValueOnce(statusResponse(500))  // attempt 1 → 500 → retry
        .mockResolvedValueOnce(okResponse(false));    // attempt 2 → 200 ✓

      await expect(service.isBlacklisted('user@example.com')).resolves.toBe(false);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('retries twice on 500 errors, succeeds on third attempt', async () => {
      mockFetch
        .mockResolvedValueOnce(statusResponse(500))  // attempt 1 → retry
        .mockResolvedValueOnce(statusResponse(503))  // attempt 2 → retry
        .mockResolvedValueOnce(okResponse(false));   // attempt 3 ✓

      await expect(service.isBlacklisted('user@example.com')).resolves.toBe(false);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('retries on network error (fetch throws), succeeds on second attempt', async () => {
      mockFetch
        .mockRejectedValueOnce(new TypeError('fetch failed'))  // attempt 1 → retry
        .mockResolvedValueOnce(okResponse(false));              // attempt 2 ✓

      await expect(service.isBlacklisted('user@example.com')).resolves.toBe(false);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('stops after 3 total attempts and throws AppError 503 (all 5xx)', async () => {
      mockFetch
        .mockResolvedValueOnce(statusResponse(500))  // attempt 1
        .mockResolvedValueOnce(statusResponse(502))  // attempt 2
        .mockResolvedValueOnce(statusResponse(503)); // attempt 3 → exhausted

      await expect(service.isBlacklisted('user@example.com')).rejects.toMatchObject({
        statusCode: 503,
        code: 'ADJUTOR_UNAVAILABLE',
      });
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('stops after 3 total attempts and throws AppError 503 (all network errors)', async () => {
      mockFetch.mockRejectedValue(new TypeError('fetch failed'));

      await expect(service.isBlacklisted('user@example.com')).rejects.toMatchObject({
        statusCode: 503,
        code: 'ADJUTOR_UNAVAILABLE',
      });
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('does NOT retry on 404 (non-transient, returns false immediately)', async () => {
      mockFetch.mockResolvedValueOnce(statusResponse(404));

      await expect(service.isBlacklisted('user@example.com')).resolves.toBe(false);
      expect(mockFetch).toHaveBeenCalledTimes(1); // no retry
    });

    it('does NOT retry on 401 (non-transient, throws ADJUTOR_ERROR)', async () => {
      mockFetch.mockResolvedValueOnce(statusResponse(401));

      await expect(service.isBlacklisted('user@example.com')).rejects.toMatchObject({
        statusCode: 503,
        code: 'ADJUTOR_ERROR',
      });
      expect(mockFetch).toHaveBeenCalledTimes(1); // no retry
    });
  });
});
