import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();

page.on('console', msg => console.log(msg.text().replaceAll('%s', '').replaceAll('%d', '').replaceAll('%c', '')));
page.on('pageerror', err => console.error(err));
await page.goto('http://localhost:7355?reporter=spec');
await page.waitForFunction(() => window.testsFinished, null, { timeout: 30000 });
// Retrieve the failure count from the window
const mocha = await page.evaluate(() => mocha);
await browser.close();
process.exit(mocha.failures);
