import { config } from 'dotenv';
config({ path: '.env' });

process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.JWT_SECRET = 'super-secret-test-key-1234567890';
process.env.ADJUTOR_API_KEY = 'adjutor-test-key';
process.env.LOG_LEVEL = 'error';

// Mock external API calls (Adjutor) but NOT the database.
// Integration tests use a real MySQL instance provided by CI services.
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
