/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.ts"],
  moduleFileExtensions: ["ts", "js", "json"],
  clearMocks: true,
  setupFiles: ["<rootDir>/src/__tests__/setup.ts"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        diagnostics: {
          ignoreCodes: [151002],
        },
      },
    ],
  },
};
