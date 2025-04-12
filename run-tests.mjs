import { chromium } from 'playwright';

// ANSI Color Codes
const green = '\x1b[32m';
const red = '\x1b[31m';
const grey = '\x1b[90m';
const reset = '\x1b[0m';

const browser = await chromium.launch();
const page = await browser.newPage();

page.on('console', msg => console.log(msg.text()));
page.on('pageerror', err => console.error(err));
await page.goto('http://localhost:7355');

await page.waitForSelector('#mocha.finished', { timeout: 10000 });

// Retrieve the failure count from the window
const mocha = await page.evaluate(() => mocha);

console.log('failures', mocha)
await browser.close();
process.exit(mocha.failures);
