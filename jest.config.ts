import type { Config } from "jest";

const config: Config = {
  testEnvironment: "node",
  transform: {
    "^.+\\.tsx?$": ["ts-jest", {
      tsconfig: {
        module: "commonjs",
        moduleResolution: "node",
      },
    }],
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  testMatch: ["**/__tests__/**/*.test.ts"],
  setupFiles: ["<rootDir>/__tests__/setup/envSetup.ts"],
  globalSetup: "<rootDir>/__tests__/setup/globalSetup.ts",
  globalTeardown: "<rootDir>/__tests__/setup/globalTeardown.ts",
  testTimeout: 30000,
  // Run test files sequentially to avoid races on the shared test database
  maxWorkers: 1,
  forceExit: true,
};

export default config;
