import type { Config } from "jest";

const config: Config = {
  projects: [
    {
      displayName: "server",
      testEnvironment: "node",
      testMatch: ["<rootDir>/tests/server/**/*.test.ts"],
      transform: { "^.+\\.tsx?$": ["ts-jest", {}] },
      moduleNameMapper: { "^@server/(.*)$": "<rootDir>/server/src/$1" },
    },
    {
      displayName: "client",
      testEnvironment: "jsdom",
      testMatch: ["<rootDir>/tests/client/**/*.test.tsx"],
      transform: { "^.+\\.tsx?$": ["ts-jest", { tsconfig: "client/tsconfig.json" }] },
      moduleNameMapper: { "^@client/(.*)$": "<rootDir>/client/src/$1" },
      setupFilesAfterFramework: ["@testing-library/jest-dom/extend-expect"],
    },
  ],
};

export default config;
