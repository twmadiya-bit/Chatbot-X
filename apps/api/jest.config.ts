import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        paths: {
          '@chatbot-x/database': ['<rootDir>/../../../packages/database/src/index.ts'],
          '@chatbot-x/shared': ['<rootDir>/../../../packages/shared/src/index.ts'],
        },
      },
    }],
  },
  moduleNameMapper: {
    '^@chatbot-x/database$': '<rootDir>/../../../packages/database/src/index.ts',
    '^@chatbot-x/shared$': '<rootDir>/../../../packages/shared/src/index.ts',
  },
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/*.spec.ts',
    '!**/index.ts',
    '!**/main.ts',
  ],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
};

export default config;
