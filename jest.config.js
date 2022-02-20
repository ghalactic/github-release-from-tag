export default {
  preset: 'es-jest',
  transformIgnorePatterns: [],
  collectCoverageFrom: [
    'src/**/*',
  ],
  coverageDirectory: 'artifacts/coverage/jest',
  testMatch: [
    '**/test/**/*.spec.*',
  ],
}
