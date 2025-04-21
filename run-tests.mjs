import { createServer } from 'http';
import { chromium } from 'playwright';
import st from 'st';

const PORT = 7355;
let browser;
let exitCode = 1;
const startServer = async () => {
return new Promise((resolve, reject) => {
  const server = createServer(st({ path: import.meta.dirname, index: 'index.html', cache: false }))
  .on('error', (err) => {
    if (err.code === 'EADDRINUSE') return resolve();
    reject(err);
  }) // Only throw other errors
  .listen(PORT, () => {
    console.log(`Server ready/listening on http://localhost:${PORT}`);
    resolve(server);
  });
});
}

const runTests = async () => {
  const server = await startServer();
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  page.on('console', msg => console.log(msg.text().replaceAll('%s','').replaceAll('%d','').replaceAll('%c','')));
  page.on('pageerror', err => console.error('PAGE ERROR:', err));

  await page.goto(`http://localhost:${PORT}?reporter=spec`);
  await page.waitForFunction(() => window.testsFinished, null, { timeout: 30000 });
  const results = await page.evaluate(() => window.mocha || { failures: 1 });
  console.log(`Tests finished. Failure count: ${results.failures}`);
  exitCode = results.failures;
  if (browser) await browser.close();
  console.log("Browser closed.");
  server?.close();
}

runTests();
