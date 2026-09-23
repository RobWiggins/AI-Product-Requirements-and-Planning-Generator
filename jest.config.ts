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
      transform: { "^.+\\.tsx?$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.json" }] },
      moduleNameMapper: {
        "^@client/(.*)$": "<rootDir>/client/src/$1",
        "^react$": "<rootDir>/client/node_modules/react",
        "^react-dom$": "<rootDir>/client/node_modules/react-dom",
        "^react-dom/test-utils$": "<rootDir>/client/node_modules/react-dom/test-utils",
        "^react-dom/client$": "<rootDir>/client/node_modules/react-dom/client",
        "^react/jsx-runtime$": "<rootDir>/client/node_modules/react/jsx-runtime",
        "^react/jsx-dev-runtime$": "<rootDir>/client/node_modules/react/jsx-dev-runtime",
      },
      setupFilesAfterEnv: ["<rootDir>/tests/client/setup.ts"],
    },
  ],
};

export default config;
