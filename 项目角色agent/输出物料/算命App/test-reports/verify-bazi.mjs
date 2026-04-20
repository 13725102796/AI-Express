import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await context.newPage();

  await page.goto('http://localhost:3002', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Select 1990/6/15/Wu/Male
  await page.locator('select').first().selectOption('1990');
  await page.locator('select').nth(1).selectOption('6');
  await page.locator('select').nth(2).selectOption('15');
  await page.locator('select').nth(3).selectOption('6');
  await page.locator('label:has-text("男")').click();
  await page.waitForTimeout(500);

  // Grab all text content to find bazi display
  const allText = await page.evaluate(() => {
    const results = [];
    const elements = document.querySelectorAll('p, span, div');
    for (const el of elements) {
      const text = el.textContent?.trim();
      if (text && (text.includes('年') || text.includes('五行') || text.includes('庚') || text.includes('辛'))) {
        results.push({
          tag: el.tagName,
          class: el.className?.substring(0, 60),
          text: text.substring(0, 80),
        });
      }
    }
    return results;
  });

  console.log('Bazi-related elements:');
  allText.forEach(el => console.log(`  <${el.tag} class="${el.class}"> ${el.text}`));

  // Check the specific bazi preview element
  const baziLine = await page.evaluate(() => {
    // Find elements with gold color styling that contain 年/月/日
    const goldEls = document.querySelectorAll('[style*="gold"], .font-display');
    for (const el of goldEls) {
      const text = el.textContent || '';
      if (text.includes('年') && text.includes('月') && text.includes('日')) {
        return { text, tag: el.tagName, class: el.className?.substring(0, 60) };
      }
    }
    return null;
  });

  console.log('\nBazi preview element:', baziLine);

  await browser.close();
}

main().catch(console.error);
