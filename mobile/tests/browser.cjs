// Exercise the actual React Native Web build with Chrome, no browser dependencies.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { spawn } = require('node:child_process');

async function main() {
  const root = path.resolve(__dirname, '../dist');
  assert.ok(fs.existsSync(path.join(root, 'index.html')), 'Run npx expo export --platform web first');
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'troday-native-browser-'));
  const screenshots = path.resolve(__dirname, '../../.tmp/mobile-preview'); fs.mkdirSync(screenshots, { recursive: true });
  const server = http.createServer((req, res) => {
    const file = path.resolve(root, `.${decodeURIComponent(new URL(req.url, 'http://localhost').pathname)}`);
    if (path.relative(root, file).startsWith('..')) return res.writeHead(403).end();
    const target = file === root ? path.join(root, 'index.html') : file;
    if (!fs.existsSync(target) || !fs.statSync(target).isFile()) return res.writeHead(404).end();
    const type = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.ttf': 'font/ttf', '.webp': 'image/webp', '.png': 'image/png' }[path.extname(target)];
    res.setHeader('Content-Type', type || 'application/octet-stream'); fs.createReadStream(target).pipe(res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let chrome, socket;
  try {
    chrome = spawn(process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--no-sandbox', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
    const endpoint = await new Promise((resolve, reject) => {
      let output = ''; const timer = setTimeout(() => reject(new Error('Chrome startup timed out')), 20000);
      chrome.on('error', reject); chrome.stderr.on('data', chunk => { output += chunk; const match = output.match(/DevTools listening on (ws:\/\/\S+)/); if (match) { clearTimeout(timer); resolve(match[1]); } });
    });
    socket = new WebSocket(endpoint); await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    let sequence = 0; const pending = new Map(), errors = [];
    socket.onmessage = ({ data }) => {
      const message = JSON.parse(data);
      if (message.id) { const request = pending.get(message.id); if (!request) return; pending.delete(message.id); clearTimeout(request.timer); message.error ? request.reject(new Error(JSON.stringify(message.error))) : request.resolve(message.result); }
      else if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
      else if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') errors.push(message.params.args.map(arg => arg.description || arg.value || '').join(' '));
    };
    const call = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
      const id = ++sequence, timer = setTimeout(() => reject(new Error(`Timed out: ${method}`)), 15000);
      pending.set(id, { resolve, reject, timer }); socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
    const { targetInfos } = await call('Target.getTargets');
    const { sessionId } = await call('Target.attachToTarget', { targetId: targetInfos.find(t => t.type === 'page').targetId, flatten: true });
    const page = (method, params) => call(method, params, sessionId);
    const evaluate = async expression => { const result = await page('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text); return result.result.value; };
    const waitFor = async expression => { for (let i = 0; i < 100; i++) { if (await evaluate(expression)) return; await new Promise(resolve => setTimeout(resolve, 50)); } throw new Error(`Not ready: ${expression}\n${await evaluate('document.body.innerText')}\n${JSON.stringify(errors)}`); };
    const click = async expression => { assert.ok(await evaluate(`(() => { const el = ${expression}; if (!el) return false; el.click(); return true; })()`), expression); await new Promise(resolve => setTimeout(resolve, 350)); };
    const byLabel = label => `Array.from(document.querySelectorAll('[aria-label]')).find(el => el.getAttribute('aria-label') === ${JSON.stringify(label)})`;
    const byText = text => `Array.from(document.querySelectorAll('[role="button"]')).find(el => el.textContent.replace(/[\\uE000-\\uF8FF]/g, '').trim() === ${JSON.stringify(text)})`;
    const tab = text => `Array.from(document.querySelectorAll('[role="tab"]')).find(el => el.textContent.includes(${JSON.stringify(text)}))`;
    const screenshot = async name => { const result = await page('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(screenshots, name + '.png'), Buffer.from(result.data, 'base64')); };
    await page('Page.enable'); await page('Runtime.enable');
    await page('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await page('Page.navigate', { url: `http://127.0.0.1:${server.address().port}/` });
    await waitFor(`document.body.innerText.includes('Tìm một nơi')`);
    assert.equal(await evaluate(`document.querySelectorAll('[role="tab"]').length`), 5);
    assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
    await screenshot('tenant-home');
    await click(tab('Hợp đồng')); await waitFor(`document.body.innerText.includes('HD-2026-099')`);
    await screenshot('tenant-contracts');
    await click(byText('Yêu cầu gia hạn')); await waitFor(`document.querySelector('textarea') !== null`);
    await evaluate(`{ const input = document.querySelector('textarea'); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(input, 'Gia hạn từ app native'); input.dispatchEvent(new Event('input', { bubbles: true })); }`);
    await click(byText('Gửi yêu cầu')); await waitFor(`document.body.innerText.includes('Đã gửi yêu cầu')`);
    await click(byLabel('Chuyển vai trò'));
    await click(`Array.from(document.querySelectorAll('[role="button"]')).find(el => el.textContent.replace(/[\\uE000-\\uF8FF]/g, '').trim().startsWith('Chủ trọ'))`);
    await waitFor(`document.body.innerText.includes('SỐ TIỀN CHƯA THU')`);
    await new Promise(resolve => setTimeout(resolve, 2200));
    await screenshot('landlord-home');
    await click(tab('Nhà & phòng')); await waitFor(`document.body.innerText.includes('Nhà trọ An Nhiên')`);
    assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
    await screenshot('landlord-properties');
    await click(byText('Thêm nhà trọ')); await waitFor(`document.querySelector('input') !== null`);
    await screenshot('landlord-house-form');
    await click(byLabel('Đóng'));
    await click(tab('Tiện ích')); await click(byText('Dịch vụ')); await waitFor(`document.body.innerText.includes('Cấu hình theo nhà')`);
    await screenshot('landlord-services');
    await click(tab('Tin nhắn')); await waitFor(`document.body.innerText.includes('Trần Ngọc Lan')`);
    await click(`Array.from(document.querySelectorAll('[role="button"]')).find(el => el.textContent.includes('Trần Ngọc Lan'))`);
    await waitFor(`document.querySelector('textarea') !== null`);
    assert.equal(await evaluate(`document.querySelector('textarea').getBoundingClientRect().bottom < innerHeight`), true);
    await screenshot('landlord-chat');
    await click(byLabel('Danh sách hội thoại'));
    for (const label of ['Tin đăng', 'Lịch xem', 'Hợp đồng', 'Người ở', 'Tài khoản']) {
      await click(tab('Tiện ích')); await click(byText(label));
      assert.ok(await evaluate('document.body.innerText.length > 200'), label);
    }
    await click(byLabel('Chuyển vai trò'));
    await click(`Array.from(document.querySelectorAll('[role="button"]')).find(el => el.textContent.replace(/[\\uE000-\\uF8FF]/g, '').trim().startsWith('Người thuê'))`);
    for (const label of ['Lịch xem', 'Hóa đơn', 'Ở ghép', 'Tài khoản']) {
      await click(tab('Tiện ích')); await click(byText(label));
      assert.ok(await evaluate('document.body.innerText.length > 150'), label);
    }
    for (const width of [320, 360, 768]) { await page('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: true }); assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true, `overflow at ${width}`); }
    await page('Page.reload'); await waitFor(`document.body.innerText.includes('Không gian người thuê')`);
    assert.deepEqual(errors, []);
    console.log('Native Web UI passed: 5 tabs, tenant renewal, role switching, owner dashboard, properties, house form, services, chat, reload and 320/360/390/768px layouts.');
    console.log(`Screenshots: ${screenshots}`);
    await call('Browser.close');
  } finally {
    socket?.close(); chrome?.kill();
    if (chrome && chrome.exitCode === null) await new Promise(resolve => { chrome.once('exit', resolve); setTimeout(resolve, 2000); });
    await new Promise(resolve => server.close(resolve));
    const absolute = path.resolve(profile);
    if (path.dirname(absolute) === path.resolve(os.tmpdir()) && path.basename(absolute).startsWith('troday-native-browser-')) {
      try { fs.rmSync(absolute, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }); }
      catch { console.warn('Chrome is still releasing its temporary profile.'); }
    }
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
