export default {
  maxWorkers: 100,
  preset: './jest.preset.js',
  setupFilesAfterEnv: ['jest-extended/all'],
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
