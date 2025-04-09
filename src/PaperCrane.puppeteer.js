import { PaperCrane } from './PaperCrane.js';

describe('PaperCrane - Puppeteer Test', () => {
  it('should render', async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto('file://' + path.resolve(__dirname, '../public/index.html'));
    await page.waitForSelector('canvas');
    await browser.close();
  });
});
