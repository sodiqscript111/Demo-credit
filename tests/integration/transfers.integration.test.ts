import 'reflect-metadata';
import '../../src/config/container';
import request from 'supertest';
import app from '../../src/app';
import db from '../../src/config/database';

describe('Transfers Integration Tests', () => {
  let token1: string;
  let token2: string;
  let wallet1Id: string;
  let wallet2Id: string;
  const email1 = `test-sender-${Date.now()}@example.com`;
  const email2 = `test-receiver-${Date.now()}@example.com`;

  beforeAll(async () => {
    await db.migrate.latest({ directory: 'src/database/migrations' });
    
    // Setup users and wallets
    const res1 = await request(app).post('/api/v1/auth/register').send({
      email: email1, password: 'Password123!', firstName: 'Sender', lastName: 'User',
    });
    token1 = res1.body.data.accessToken;

    const res2 = await request(app).post('/api/v1/auth/register').send({
      email: email2, password: 'Password123!', firstName: 'Receiver', lastName: 'User',
    });
    token2 = res2.body.data.accessToken;

    // Get wallet IDs
    const walletRes1 = await request(app).get('/api/v1/wallets/me').set('Authorization', `Bearer ${token1}`);
    wallet1Id = walletRes1.body.data.id;

    const walletRes2 = await request(app).get('/api/v1/wallets/me').set('Authorization', `Bearer ${token2}`);
    wallet2Id = walletRes2.body.data.id;

    // Fund sender wallet
    await request(app).post('/api/v1/wallets/fund').set('Authorization', `Bearer ${token1}`).send({ amount: '5000' });
  });

  afterAll(async () => {
    // Cleanup
    await db('users').where('email', 'in', [email1, email2]).del();
    await db.destroy();
  });

  describe('POST /api/v1/transfers', () => {
    it('should successfully transfer funds between wallets', async () => {
      const response = await request(app)
        .post('/api/v1/transfers')
        .set('Authorization', `Bearer ${token1}`)
        .set('Idempotency-Key', `transfer-${Date.now()}`)
        .send({
          fromWalletId: wallet1Id,
          toWalletId: wallet2Id,
          amount: '1000',
        });

      expect(response.status).toBe(201);
      expect(response.body.data).toHaveProperty('status', 'completed');
      expect(response.body.data.amount).toEqual(expect.stringMatching(/^1000(\.0+)?$/));
    });

    it('should return 409 Conflict (or existing transfer) on idempotent replay', async () => {
      const idempotencyKey = `test-idem-replay-${Date.now()}`;
      
      const firstRes = await request(app)
        .post('/api/v1/transfers')
        .set('Authorization', `Bearer ${token1}`)
        .set('Idempotency-Key', idempotencyKey)
        .send({
          fromWalletId: wallet1Id,
          toWalletId: wallet2Id,
          amount: '500.0000',
        });

      expect(firstRes.status).toBe(201);

      const secondRes = await request(app)
        .post('/api/v1/transfers')
        .set('Authorization', `Bearer ${token1}`)
        .set('Idempotency-Key', idempotencyKey)
        .send({
          fromWalletId: wallet1Id,
          toWalletId: wallet2Id,
          amount: '500.0000',
        });

      // IdempotencyMiddleware returns the original response
      expect(secondRes.status).toBe(201);
      expect(secondRes.body.data.id).toBe(firstRes.body.data.id);
    });

    it('should fail if insufficient funds', async () => {
      const response = await request(app)
        .post('/api/v1/transfers')
        .set('Authorization', `Bearer ${token1}`)
        .set('Idempotency-Key', `test-idem-insufficient-${Date.now()}`)
        .send({
          fromWalletId: wallet1Id,
          toWalletId: wallet2Id,
          amount: '1000000.0000',
        });

      expect(response.status).toBe(422); // InsufficientFundsError is mapped to 422
      expect(response.body).toHaveProperty('message', 'Insufficient funds');
    });
  });
});
