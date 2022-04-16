export default {
  preset: './jest.preset.js',
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
