/** @type {import('jest-environment-puppeteer').JestPuppeteerConfig} */
module.exports = {
  launch: {
    headless: "new",
    product: "chrome",
  },
  browserContext: "default",
};
