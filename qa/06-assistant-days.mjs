import { writeFile } from 'node:fs/promises';
import { launchChrome, killChrome, CDP } from './cdp-lib.mjs';

const BASE = 'http://localhost:5180';
const out = {};
const chrome = await launchChrome({ port: 9339, profile: 'qa-assistant-days-profile', width: 1440, height: 900 });
let cdp;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  cdp = await CDP.connect(chrome.port, { width: 1440, height: 900 });
  await cdp.navigate(`${BASE}/`, { waitFor: '.intro' });
  await cdp.click('.intro__skip');
  out.timezone = await cdp.eval('({ zone: Intl.DateTimeFormat().resolvedOptions().timeZone, offset: new Date().getTimezoneOffset(), now: new Date().toString() })');
  await cdp.navigate(`${BASE}/assistant`, { waitFor: '#chat-input' });
  await cdp.click('.prompt-suggestion');
  out.prompt = await cdp.eval('document.querySelector("#chat-input").value');
  await cdp.click('.chat-compose button[type="submit"]');
  for (let i = 0; i < 60; i += 1) {
    if (await cdp.eval('!!document.querySelector(".plan-preview")')) break;
    await sleep(150);
  }
  out.preview = await cdp.eval('document.querySelector(".plan-preview")?.innerText');
  out.dayHeadings = await cdp.eval('Array.from(document.querySelectorAll(".plan-preview__day strong")).map(e=>e.textContent.trim())');
  await cdp.click('text=Save as trip');
  await sleep(500);
  out.savedPath = await cdp.eval('location.pathname');
  out.itineraryHeading = await cdp.eval('document.querySelector("main h1")?.textContent.trim()');
  out.itineraryMeta = await cdp.eval('Array.from(document.querySelectorAll(".tp-meta-list li")).map(e=>e.textContent.trim()).slice(0,4)');
  out.dayCards = await cdp.eval('document.querySelectorAll(".tp-day").length');
} catch (e) { out.fatal = e.stack || e.message; }
finally {
  cdp?.close(); await killChrome(chrome);
  await writeFile('qa/assistant-days.json', JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
}
