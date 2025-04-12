import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();

page.on('console', msg => console.log(msg.text()));
page.on('pageerror', err => console.error(err));
await page.goto('http://localhost:7355');

await page.waitForFunction(() => document.getElementById('mocha')?.classList.contains('finished'), null, { timeout: 30000 });
// Retrieve the failure count from the window
const mocha = await page.evaluate(() => mocha);

console.log('failures', mocha)
await browser.close();
process.exit(mocha.failures);
