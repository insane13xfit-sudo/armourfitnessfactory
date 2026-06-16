const puppeteer = require('puppeteer');
const path = require('path');

(async ()=>{
  const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  const abs = path.resolve(process.cwd(), '../spin-wheel.html');
  const url = 'file://' + abs;
  await page.setViewport({ width: 3840, height: 2160 });
  console.log('Loading', url);
  await page.goto(url, { waitUntil: 'networkidle0' });
  await page.waitForTimeout(600);

  // ensure labels are visible and wheel neutral
  await page.evaluate(()=>{
    const w = document.getElementById('wheel'); if (w){ w.style.transition='none'; w.style.transform='rotate(0deg)'; }
    document.body.style.background='#000';
  });

  const el = await page.$('#wheel');
  if(!el){ console.error('Wheel not found'); await browser.close(); process.exit(1); }
  const out = path.resolve(process.cwd(), '../spin-wheel-4k-widescreen.png');
  await el.screenshot({ path: out, omitBackground: false });
  console.log('Saved', out);
  await browser.close();
})();
