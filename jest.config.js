/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  moduleNameMapper: {
    "uuid": require.resolve("uuid"),
  },
  globals: {
    DIST: false,
    APP_ID: "test"
  }
};