import esPreset from 'es-jest/jest-preset.js'
import puppeteerPreset from 'jest-puppeteer/jest-preset.js'

export default {
  ...puppeteerPreset,
  ...esPreset,
}
