# Demo Credit MVP - Wallet Service

Demo Credit is a minimal viable product (MVP) mobile lending application backend. It provides wallet functionality enabling users to receive disbursed loans and make repayments/transfers.

## 🚀 Tech Stack
- **Runtime:** Node.js (v18+ LTS)
- **Language:** TypeScript
- **Framework:** Express.js
- **Database:** MySQL
- **Query Builder & Migrations:** Knex.js
- **Dependency Injection:** tsyringe & reflect-metadata
- **Validation:** Zod
- **Authentication:** Faux JWT implementation & bcrypt password hashing

## 🏗️ Architecture & Design Decisions
The application strictly adheres to the **Controller-Service-Repository** pattern. 
- **Controllers** handle HTTP requests, routing, and response formatting.
- **Services** house the core business logic (e.g., wallet deduction, idempotency checks, third-party API integration).
- **Repositories** manage database interactions (Knex queries).
This promotes **WET and DRY principles**, clear separation of concerns, and makes the application highly testable. Dependency injection (`tsyringe`) ensures components are modular.

## 🗄️ Database Design (E-R Diagram)
*Note: A visual E-R diagram can be created in dbdesigner.net using the following schema relationship:*

- **Users Table:** `id` (PK), `email`, `password_hash`, `first_name`, `last_name`, `created_at`
- **Wallets Table:** `id` (PK), `user_id` (FK -> Users.id), `balance`, `created_at`
- **Transfers Table:** `id` (PK), `from_wallet_id` (FK -> Wallets.id), `to_wallet_id` (FK -> Wallets.id), `amount`, `status`, `created_at`
- **Ledger Entries Table:** `id` (PK), `wallet_id` (FK -> Wallets.id), `transfer_id` (FK -> Transfers.id), `amount`, `type` (CREDIT/DEBIT), `created_at`

*Relationships:*
- A User has ONE Wallet (1:1)
- A Wallet has MANY Transfers (1:N)
- A Wallet has MANY Ledger Entries (1:N)
- A Transfer has TWO Ledger Entries (1:2 - One Debit, One Credit)

## 🛡️ Key Features
- **Idempotent Transfers:** Safe POST requests using `Idempotency-Key` headers to prevent double-spending.
- **Race Condition Prevention:** Knex transactions and `FOR UPDATE` row-level locks prevent concurrent double-spend attacks.
- **Lendsqr Karma Integration:** Rejects onboarding for blacklisted identities automatically.

## ⚙️ Local Setup & Deployment

**1. Using Docker (Recommended)**
```bash
docker-compose up -d --build
```
This spins up both the MySQL database and the Node API, running all Knex migrations automatically.

**2. Manual Setup**
- Run `npm install`
- Copy `.env.example` to `.env` and configure your local MySQL credentials.
- Run database migrations: `npm run migrate`
- Start server: `npm run dev`

## 🧪 Testing
The project features a comprehensive test suite (Unit & Integration tests) using Jest, `supertest`, and an in-memory SQLite database to mock production interactions.
```bash
npm run test
```
