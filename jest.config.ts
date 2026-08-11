import type { Config } from 'jest';

const sharedConfig = {
  preset: 'ts-jest' as const,
  testEnvironment: 'node' as const,
  moduleFileExtensions: ['ts', 'js'],
  clearMocks: true,
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: {
          experimentalDecorators: true,
          emitDecoratorMetadata: true,
        },
      },
    ] as [string, Record<string, unknown>],
  },
};

const config: Config = {
  projects: [
    {
      ...sharedConfig,
      displayName: 'unit',
      roots: ['<rootDir>/tests/unit'],
      testMatch: ['**/*.test.ts'],
      setupFiles: ['<rootDir>/tests/setup.ts'],
    },
    {
      ...sharedConfig,
      displayName: 'integration',
      roots: ['<rootDir>/tests/integration'],
      testMatch: ['**/*.test.ts'],
      setupFiles: ['<rootDir>/tests/setup-integration.ts'],
    },
  ],
};

export default config;
