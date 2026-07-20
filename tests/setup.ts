import { config } from 'dotenv';
config({ path: '.env' });

process.env.NODE_ENV = 'test';
process.env.PORT = '3000';
process.env.JWT_SECRET = 'super-secret-test-key-1234567890';
process.env.ADJUTOR_API_KEY = 'adjutor-test-key';
process.env.LOG_LEVEL = 'error';

jest.mock('../src/config/database', () => {
  const knex = require('knex');
  const { postProcessResponse } = require('../src/shared/utils/case');
  const db = knex({
    client: 'sqlite3',
    connection: { filename: ':memory:' },
    useNullAsDefault: true,
    postProcessResponse,
  });
  return {
    __esModule: true,
    default: db,
  };
});

global.fetch = jest.fn().mockImplementation((url: string | URL | Request) => {
  const urlStr = url.toString();
  if (urlStr.includes('adjutor')) {
    return Promise.resolve({
      ok: false,
      status: 404,
      json: async () => ({ status: 'success', message: 'Not found', data: null }),
      text: async () => '',
    });
  }
  return Promise.resolve({ ok: true, json: async () => ({}) });
}) as any;
