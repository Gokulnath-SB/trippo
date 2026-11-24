import { writeFile } from 'node:fs/promises';
import { launchChrome, killChrome, CDP } from './cdp-lib.mjs';

const BASE = 'http://localhost:5181';
const out = {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 50; i += 1) {
  try { if ((await fetch(BASE)).ok) break; } catch { /* wait */ }
  await sleep(150);
}
const chrome = await launchChrome({ port: 9340, profile: 'qa-preview-profile', width: 1440, height: 900 });
let cdp;
try {
  cdp = await CDP.connect(chrome.port, { width: 1440, height: 900 });
  await cdp.navigate(`${BASE}/`, { waitFor: '.intro' });
  await cdp.click('.intro__skip');
  await cdp.navigate(`${BASE}/assistant`, { waitFor: '#chat-input' });
  await cdp.click('.prompt-suggestion');
  await cdp.click('.chat-compose button[type="submit"]');
  for (let i = 0; i < 60; i += 1) {
    if (await cdp.eval('!!document.querySelector(".plan-preview")')) break;
    await sleep(150);
  }
  await cdp.click('text=Save as trip');
  await sleep(600);
  out.tripPath = await cdp.eval('location.pathname');
  cdp.resetErrors();
  await cdp.navigate(`${BASE}/budget${out.tripPath.replace('/itinerary/', '/')}`, { waitFor: 'body' });
  await sleep(500);
  out.dom = await cdp.eval(`({ bodyLength: document.body.innerText.length, main: document.querySelector('main')?.innerText.slice(0,200) || null })`);
  out.errors = { console: cdp.consoleErrors.filter(e => !e.includes('React Router Future Flag')).slice(0,5), page: cdp.pageErrors.slice(0,3) };
} catch (e) { out.fatal = e.stack || e.message; }
finally {
  cdp?.close(); await killChrome(chrome);
  await writeFile('qa/preview-budget.json', JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
}
