const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security', '--disable-features=IsolateOrigins,sitePerProcess'],
  });

  const page = await browser.newPage();
  
  const allConsole = [];
  
  page.on('console', async msg => {
    const args = await Promise.all(msg.args().map(async h => {
      try { return await h.jsonValue(); } catch { return await h.toString(); }
    }));
    allConsole.push({ type: msg.type(), args: args.map(a => typeof a === 'string' ? a : JSON.stringify(a)) });
    if (msg.type() === 'error') {
      console.log(`CONSOLE [${msg.type()}]:`, JSON.stringify(args));
    }
  });
  
  page.on('pageerror', err => {
    console.log('PAGE ERROR:', err.message);
    console.log('FULL STACK:', err.stack);
  });

  try {
    console.log('Navigating...');
    await page.goto('http://localhost:5176/admin/qa-simulator', { waitUntil: 'networkidle0', timeout: 30000 });
    console.log('Page loaded');

    await page.waitForSelector('text/Player Experience Simulator', { timeout: 10000 });
    console.log('QA Hub loaded');

    const startButton = await page.$('text/Start Simulation');
    if (startButton) {
      console.log('Clicking Start Simulation...');
      await startButton.click();
    }

    await new Promise(r => setTimeout(r, 5000));

    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log('\n=== BODY TEXT ===');
    console.log(bodyText);
    console.log('=== END BODY TEXT ===\n');

    const renderError = await page.evaluate(() => localStorage.getItem('__nexus_render_error__'));
    if (renderError) console.log('RENDER ERROR:', renderError);

    const routerError = await page.evaluate(() => localStorage.getItem('__nexus_router_error__'));
    if (routerError) console.log('ROUTER ERROR:', routerError);

  } catch (e) {
    console.error('Script error:', e);
  } finally {
    await browser.close();
  }
})();
