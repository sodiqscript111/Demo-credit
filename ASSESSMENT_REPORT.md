# Security Assessment & API Review Report

### How API Endpoints are Secured
All sensitive API endpoints (Wallets, Transfers, Ledger) are secured using a custom **AuthMiddleware**. This middleware enforces that requests include a valid Bearer Token (JWT). If the token is missing, malformed, or expired, the request is immediately rejected with a `401 Unauthorized`. Additionally, we implemented an `IdempotencyMiddleware` that mandates an `Idempotency-Key` header on critical mutating endpoints (e.g., `POST /api/v1/transfers`) to prevent replay attacks and duplicate processing.

### Authentication & Authorization Handling
For this MVP, a faux token-based authentication system was implemented using JWTs. Upon successful registration or login, the backend issues a signed JWT containing the user's `sub` (UUID). 
For **Authorization**, the application strict-checks ownership to prevent **Insecure Direct Object Reference (IDOR)** vulnerabilities. In the Service layer, whenever a user requests a resource (like fetching a wallet balance or a transfer receipt), the backend manually verifies that the `userId` attached to the requested resource matches the `userId` decoded from their JWT. If there is a mismatch, the system throws a `403 Forbidden` error.

### Potential Vulnerabilities Mitigated
1. **Race Conditions & Double Spending:** A major vulnerability in wallet APIs is concurrent withdrawal requests allowing a user to bypass insufficient funds logic. This was mitigated by wrapping transfer logic in strict Knex ACID transactions and using row-level locking (`FOR UPDATE`). This guarantees operations process sequentially.
2. **SQL Injection:** By utilizing the Knex.js query builder and an abstraction layer (Repositories) instead of raw SQL strings, all inputs are automatically parameterized, neutralizing SQL injection vectors.
3. **Blacklisted Actors:** Before onboarding, user identities are checked against the Lendsqr Adjutor Karma API. Known bad actors are rejected before their data is ever persisted.

### Input Validation & Protection
To prevent Large Payload Denial of Service (DoS) attacks, the API globally restricts incoming JSON payloads to `10kb` via Express middleware. Furthermore, we utilize the **Zod** schema validation library. Every incoming request payload (body, params, query) is validated by a global `ValidationMiddleware` against a strict schema. For instance, transfer amounts are validated to ensure they are strictly positive numbers. If validation fails, the API instantly returns a `422 Unprocessable Entity` containing a clear breakdown of the failed fields, protecting the business logic from malformed or malicious data.

### Production Security Improvements
In a true production environment, I would further improve security by:
- Implementing strict Rate Limiting via a reverse proxy (Nginx/Cloudflare) or Redis.
- Implementing an API Gateway / WAF to filter out DDoS traffic.
- Using mutual TLS (mTLS) for internal microservice communication.
- Implementing OAuth2.0 / OpenID Connect for robust, refresh-token-based authentication.

---

# Failure Handling & Debugging Assessment

### Handling Failing Functionalities & Unexpected Errors
The application utilizes a robust, centralized error-handling strategy. We created a custom `AppError` class (and specific sub-classes like `NotFoundError`, `InsufficientFundsError`, `ForbiddenError`). In the business logic (Services), we throw these domain-specific errors. A global `ErrorMiddleware` intercepts them and formats them into standardized, predictable JSON responses for the client (mapping domain errors to correct HTTP status codes like `404`, `422`, `403`), preventing stack traces from leaking to the user.

### Detecting, Debugging, and Tracing Issues
We implemented a custom `loggerMiddleware` (using a tool like Winston/Pino concept). Every incoming request is assigned a unique `x-request-id` header which is logged alongside the request method, path, and response time. This allows us to trace a specific user's journey through the logs. If a failure occurs, the stack trace is logged to the console (and potentially external services like Sentry/Datadog in production) tagged with the exact Request ID for fast isolation.

### Approach to Logging, Monitoring, and Reliability
Reliability is prioritized through graceful degradation and retries. When integrating with unreliable third-party APIs (like the Lendsqr Adjutor Karma API), we use a custom `withRetry` utility that implements exponential backoff. This ensures that a transient network blip doesn't completely halt the user onboarding process. 

### Example Failure Scenario & Diagnosis
**Scenario:** The Lendsqr Adjutor Karma API experiences a temporary outage, returning `503 Service Unavailable` when users try to register.
**Diagnosis & Fix:** 
1. Our monitoring alerts (e.g., Datadog) would spike showing increased `500` errors on `POST /api/v1/auth/register`. 
2. We would query our centralized logs for the specific `x-request-id` attached to the failures and see the trace points to `AdjutorService.isBlacklisted`.
3. Because we implemented a `withRetry` block, the system automatically attempted 3 retries before failing. 
4. **Fix:** To make the system highly resilient to prolonged third-party outages, we would decouple the dependency by implementing an asynchronous background process using a message queue (e.g., RabbitMQ or BullMQ). Registration would instantly succeed, and a "karma_check" job would be pushed to the queue. If the Lendsqr API is down, the job would fail and be routed to a Dead Letter Queue (DLQ), where it can be automatically or manually reprocessed once the API recovers, preventing the outage from blocking our business operations.
