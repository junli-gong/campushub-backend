import type { Config } from 'jest';
const config: Config = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.jest.json' }],
  },
  maxWorkers: 1,
  testTimeout: 120000,
  clearMocks: true,
  restoreMocks: true,
  collectCoverageFrom: [
    'src/services/**/*.ts',
    'src/controllers/**/*.ts',
    '!src/**/__tests__/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'json-summary', 'lcov', 'html'],
  coverageThreshold: {
    './src/services/': { statements: 81, branches: 81 },
    './src/controllers/': { statements: 81, branches: 81 },
  },
};
export default config;
