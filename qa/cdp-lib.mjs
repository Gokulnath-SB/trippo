// PETER QA harness: minimal Chrome DevTools Protocol driver using Node 24 globals.
// No third-party dependencies. Only writes under qa/.
import { spawn } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function launchChrome({ port = 9333, profile = 'qa-profile', width = 1440, height = 900 } = {}) {
  const userDataDir = path.join('C:\\Users\\DELL\\AppData\\Local\\Temp\\opencode', profile);
  const proc = spawn(CHROME, [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    `--window-size=${width},${height}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    '--disable-extensions',
    'about:blank',
  ], { stdio: 'ignore', detached: false });

  let version = null;
  for (let i = 0; i < 100; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (res.ok) { version = await res.json(); break; }
    } catch { /* not ready */ }
    await sleep(100);
  }
  if (!version) { proc.kill(); throw new Error(`Chrome did not start on port ${port}`); }
  return { proc, port, userDataDir, version };
}

export async function killChrome(handle) {
  if (!handle?.proc) return;
  try { handle.proc.kill(); } catch { /* ignore */ }
  await sleep(200);
}

export class CDP {
  constructor(ws, { width = 1440, height = 900 } = {}) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.consoleErrors = [];
    this.pageErrors = [];
    this.networkFailures = [];
    this.width = width;
    this.height = height;
    ws.addEventListener('message', (event) => {
      let msg;
      try { msg = JSON.parse(event.data); } catch { return; }
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(`${msg.error.message} (${msg.error.code})`));
        else resolve(msg.result);
        return;
      }
      if (msg.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(msg.params.type)) {
        const text = (msg.params.args || []).map((a) => a.value ?? a.description ?? a.type).join(' ');
        this.consoleErrors.push(`[${msg.params.type}] ${text}`);
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        const d = msg.params.exceptionDetails || {};
        this.pageErrors.push(`${d.text || 'exception'} ${d.exception?.description || ''}`);
      }
      if (msg.method === 'Log.entryAdded' && ['error', 'warning'].includes(msg.params.entry.level)) {
        this.consoleErrors.push(`[log:${msg.params.entry.level}] ${msg.params.entry.text}`);
      }
      if (msg.method === 'Network.loadingFailed' && !msg.params.canceled) {
        this.networkFailures.push(`${msg.params.errorText} ${msg.params.type || ''}`);
      }
    });
  }

  static async connect(port, opts = {}) {
    // Reuse the existing blank target instead of creating a new one.
    let targets = [];
    for (let i = 0; i < 50; i += 1) {
      try {
        const res = await fetch(`http://127.0.0.1:${port}/json/list`);
        targets = await res.json();
        if (targets.some((t) => t.type === 'page')) break;
      } catch { /* retry */ }
      await sleep(100);
    }
    const target = targets.find((t) => t.type === 'page');
    if (!target) throw new Error('No page target available');
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve, { once: true });
      ws.addEventListener('error', reject, { once: true });
    });
    const cdp = new CDP(ws, opts);
    await cdp.send('Runtime.enable');
    await cdp.send('Page.enable');
    await cdp.send('Log.enable');
    await cdp.send('Network.enable');
    await cdp.setViewport(opts.width || 1440, opts.height || 900);
    return cdp;
  }

  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async setViewport(width, height, mobile = false) {
    this.width = width; this.height = height;
    await this.send('Emulation.setDeviceMetricsOverride', {
      width, height, deviceScaleFactor: 1, mobile,
    });
  }

  async navigate(url, { waitFor = 'body', timeout = 15000 } = {}) {
    await this.send('Page.navigate', { url });
    const start = Date.now();
    while (Date.now() - start < timeout) {
      try {
        const ready = await this.eval('document.readyState === "complete" && !!document.querySelector("' + waitFor.replace(/"/g, '\\"') + '")');
        if (ready) { await sleep(350); return; }
      } catch { /* navigation in progress */ }
      await sleep(120);
    }
    throw new Error(`Timed out waiting for ${waitFor} at ${url}`);
  }

  async eval(expression, awaitPromise = false) {
    const result = await this.send('Runtime.evaluate', {
      expression, returnByValue: true, awaitPromise, userGesture: true,
    });
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    }
    return result.result.value;
  }

  async click(selectorOrText, { nth = 0 } = {}) {
    const expr = `(function(){
      const q = ${JSON.stringify(selectorOrText)};
      let els;
      if (q.startsWith('text=')) {
        const t = q.slice(5).toLowerCase();
        els = Array.from(document.querySelectorAll('button, a, [role="button"]'))
          .filter(el => (el.getAttribute('aria-label') || el.textContent || '').toLowerCase().includes(t));
      } else { els = Array.from(document.querySelectorAll(q)); }
      const el = els[${nth}];
      if (!el) throw new Error('No element: ' + q + ' (found ' + els.length + ')');
      el.scrollIntoView({block:'center'});
      el.click();
      return { tag: el.tagName, text: (el.textContent||'').trim().slice(0,80), aria: el.getAttribute('aria-label') };
    })()`;
    const out = await this.eval(expr);
    await sleep(200);
    return out;
  }

  async setValue(selector, value, { nth = 0 } = {}) {
    const expr = `(function(){
      const el = Array.from(document.querySelectorAll(${JSON.stringify(selector)}))[${nth}];
      if (!el) throw new Error('No input: ' + ${JSON.stringify(selector)});
      el.scrollIntoView({block:'center'});
      const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype
        : el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
      setter.call(el, ${JSON.stringify(String(value))});
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return el.value;
    })()`;
    const out = await this.eval(expr);
    await sleep(120);
    return out;
  }

  async check(selector, value = true, { nth = 0 } = {}) {
    await this.eval(`(function(){
      const el = Array.from(document.querySelectorAll(${JSON.stringify(selector)}))[${nth}];
      if (!el) throw new Error('No checkbox: ' + ${JSON.stringify(selector)});
      if (el.checked !== ${Boolean(value)}) el.click();
      return el.checked;
    })()`);
    await sleep(100);
  }

  async screenshot(file) {
    await mkdir(path.dirname(file), { recursive: true });
    const { data } = await this.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await writeFile(file, Buffer.from(data, 'base64'));
    return file;
  }

  async key(key, code, keyCode, modifiers = 0) {
    await this.send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode, modifiers });
    await this.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode, modifiers });
    await sleep(150);
  }

  async pressTab(shift = false) { await this.key('Tab', 'Tab', 9, shift ? 8 : 0); }
  async pressEscape() { await this.key('Escape', 'Escape', 27); }

  resetErrors() { this.consoleErrors = []; this.pageErrors = []; this.networkFailures = []; }

  errorSummary(label) {
    return {
      label,
      consoleErrors: [...this.consoleErrors],
      pageErrors: [...this.pageErrors],
      networkFailures: [...this.networkFailures],
    };
  }

  close() { try { this.ws.close(); } catch { /* ignore */ } }
}
