import { writeFile } from 'node:fs/promises';
import { launchChrome, killChrome, CDP } from './cdp-lib.mjs';

const BASE = 'http://localhost:5180';
const viewports = [
  [360, 800, '360x800'],
  [768, 1024, '768x1024'],
  [1440, 900, '1440x900'],
];
const pages = [
  ['/', 'home'],
  ['/explore', 'explore'],
  ['/create-trip', 'create-trip'],
  ['/assistant', 'assistant'],
];
const out = [];
const chrome = await launchChrome({ port: 9335, profile: 'qa-responsive-profile', width: 1440, height: 900 });
let cdp;
try {
  cdp = await CDP.connect(chrome.port, { width: 1440, height: 900 });
  await cdp.navigate(`${BASE}/`, { waitFor: '.intro' });
  await cdp.click('.intro__skip');
  for (const [w, h, label] of viewports) {
    await cdp.setViewport(w, h, w < 500);
    for (const [route, name] of pages) {
      await cdp.navigate(`${BASE}${route}`, { waitFor: 'main' });
      await new Promise((r) => setTimeout(r, 350));
      const metrics = await cdp.eval(`(function(){
        const de = document.documentElement;
        const controls = Array.from(document.querySelectorAll('a[href], button, input, select, textarea'))
          .filter(el => el.offsetParent !== null && getComputedStyle(el).visibility !== 'hidden'
            && el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().height > 0
            && !el.closest('.sr-only'));
        const small = controls.filter(el => {
          const r = el.getBoundingClientRect();
          return r.width < 44 || r.height < 44;
        }).slice(0,12).map(el => ({
          tag: el.tagName,
          label: (el.getAttribute('aria-label') || el.textContent || el.getAttribute('placeholder') || '').replace(/\\s+/g,' ').trim().slice(0,50),
          w: Math.round(el.getBoundingClientRect().width),
          h: Math.round(el.getBoundingClientRect().height)
        }));
        return {
          scrollWidth: de.scrollWidth,
          clientWidth: de.clientWidth,
          overflow: de.scrollWidth > de.clientWidth,
          controlsChecked: controls.length,
          smallCount: small.length,
          small
        };
      })()`);
      const file = `qa/screenshots/${name}-${label}.png`;
      await cdp.screenshot(file);
      out.push({ viewport: label, route, file, ...metrics });
    }
  }
} catch (e) { out.push({ fatal: e.stack || e.message }); }
finally {
  cdp?.close(); await killChrome(chrome);
  await writeFile('qa/responsive-results.json', JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
}
