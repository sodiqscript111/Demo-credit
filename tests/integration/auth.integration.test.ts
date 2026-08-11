import 'reflect-metadata';
import '../../src/config/container';
import request from 'supertest';
import app from '../../src/app';
import db from '../../src/config/database';

describe('Auth Integration Tests', () => {
  beforeAll(async () => {
    await db.migrate.latest({ directory: 'src/database/migrations' });
  });

  afterAll(async () => {
    // Disable FK checks for clean teardown, then re-enable
    await db.raw('SET FOREIGN_KEY_CHECKS = 0');
    await db('users').where('email', 'like', 'test%@example.com').del();
    await db.raw('SET FOREIGN_KEY_CHECKS = 1');
    await db.destroy();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user and return a token', async () => {
      const email = `test-${Date.now()}@example.com`;
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email,
          password: 'Password123!',
          firstName: 'Test',
          lastName: 'User',
        });

      expect(response.status).toBe(201);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data.user).toHaveProperty('email', email);
    });

    it('should fail with validation error on bad input', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'not-an-email',
          password: 'short',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login an existing user', async () => {
      const email = `test-login-${Date.now()}@example.com`;
      const password = 'Password123!';

      // Register first
      const registerRes = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email,
          password,
          firstName: 'Test',
          lastName: 'Login',
        });

      expect(registerRes.status).toBe(201);

      // Then login
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email,
          password,
        });
        
      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('accessToken');
    });
  });
});
