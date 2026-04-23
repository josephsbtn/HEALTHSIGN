// Jest configuration
export default {
  testEnvironment: "node",
  coverageDirectory: "coverage",
  collectCoverageFrom: ["service/**/*.js", "database/**/*.js", "utils.js"],
  testMatch: ["**/__tests__/**/*.test.js", "**/*.spec.js"],
  transform: {},
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
};
