import { rm, writeFile } from 'node:fs/promises';
import { launchChrome, killChrome, CDP } from './cdp-lib.mjs';

const BASE = 'http://localhost:5180';
const out = { cases: [] };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Fresh profile: create the trip and open its budget route in the same browser session.
await rm('C:\\Users\\DELL\\AppData\\Local\\Temp\\opencode\\qa-budget-profile', { recursive: true, force: true });
const chrome = await launchChrome({ port: 9337, profile: 'qa-budget-profile', width: 1440, height: 900 });
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
  await sleep(500);
  out.tripPath = await cdp.eval('location.pathname');
  const budgetPath = `/budget${out.tripPath.replace('/itinerary/', '/')}`;

  for (const route of [budgetPath, '/budget/nope']) {
    cdp.resetErrors();
    await cdp.navigate(`${BASE}${route}`, { waitFor: 'body' });
    await sleep(600);
    const dom = await cdp.eval(`({
      path: location.pathname,
      mainText: document.querySelector('main')?.innerText.replace(/\\s+/g,' ') || null,
      h1: document.querySelector('main h1')?.textContent.trim() || null,
      viteOverlay: !!document.querySelector('vite-error-overlay'),
      bodyLength: document.body.innerText.length
    })`);
    if (route === budgetPath) await cdp.screenshot('qa/screenshots/budget-crash.png');
    out.cases.push({ route, dom, errors: cdp.errorSummary(route) });
  }
} catch (e) { out.fatal = e.stack || e.message; }
finally {
  cdp?.close(); await killChrome(chrome);
  await writeFile('qa/budget-crash.json', JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
}
