export default {
  preset: 'es-jest',
  transformIgnorePatterns: [
    'src/main.js',
  ],
  collectCoverageFrom: [
    'src/**/*',
  ],
  coverageDirectory: 'artifacts/coverage/jest',
  testMatch: [
    '**/test/**/*.spec.*',
  ],
}
