// Run with Node 22+ and a locally installed Chrome (no npm dependencies).
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const http = require("node:http");
const { spawn } = require("node:child_process");

async function main() {
  const root = path.resolve(__dirname, "..");
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "troday-browser-"));
  const chromePath = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
  const server = http.createServer((req, res) => {
    const file = path.resolve(root, `.${decodeURIComponent(new URL(req.url, "http://localhost").pathname)}`);
    const relative = path.relative(root, file);
    if (relative.startsWith("..") || path.isAbsolute(relative)) { res.writeHead(403).end(); return; }
    const target = file === root ? path.join(root, "index.html") : file;
    if (!fs.existsSync(target) || !fs.statSync(target).isFile()) { res.writeHead(404).end(); return; }
    const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".webp": "image/webp", ".png": "image/png" };
    res.setHeader("Content-Type", types[path.extname(target)] || "application/octet-stream");
    fs.createReadStream(target).pipe(res);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  let chrome, socket;
  try {
    chrome = spawn(chromePath, ["--headless=new", "--no-sandbox", "--disable-gpu", "--no-first-run", "--no-default-browser-check", "--disable-background-networking", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank"], { windowsHide: true, stdio: ["ignore", "ignore", "pipe"] });
    const endpoint = await new Promise((resolve, reject) => {
      let output = "";
      const timer = setTimeout(() => reject(new Error(`Chrome startup timed out: ${output.slice(-1000)}`)), 20000);
      chrome.on("error", (error) => { clearTimeout(timer); reject(error); });
      chrome.stderr.on("data", (chunk) => {
        output += chunk.toString(); const match = output.match(/DevTools listening on (ws:\/\/\S+)/);
        if (match) { clearTimeout(timer); resolve(match[1]); }
      });
    });
    socket = new WebSocket(endpoint);
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    let sequence = 0;
    const pending = new Map(); const errors = [];
    socket.onmessage = ({ data }) => {
      const message = JSON.parse(data);
      if (message.id) {
        const request = pending.get(message.id); if (!request) return;
        pending.delete(message.id); clearTimeout(request.timer);
        if (message.error) request.reject(new Error(JSON.stringify(message.error))); else request.resolve(message.result);
      } else if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails.text + ": " + (message.params.exceptionDetails.exception?.description || ""));
    };
    const call = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
      const id = ++sequence;
      const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Timed out: ${method}`)); }, 15000);
      pending.set(id, { resolve, reject, timer }); socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
    const { targetInfos } = await call("Target.getTargets");
    const target = targetInfos.find((item) => item.type === "page");
    const { sessionId } = await call("Target.attachToTarget", { targetId: target.targetId, flatten: true });
    const page = (method, params) => call(method, params, sessionId);
    const evaluate = async (expression) => {
      const result = await page("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
      return result.result.value;
    };
    await page("Page.enable"); await page("Runtime.enable");
    await page("Emulation.setTimezoneOverride", { timezoneId: "America/Los_Angeles" });
    await page("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    await page("Page.addScriptToEvaluateOnNewDocument", { source: `const NativeDate = Date; window.Date = class extends NativeDate { constructor(...args) { super(...(args.length ? args : [NativeDate.parse('2026-10-24T03:00:00Z')])); } static now() { return NativeDate.parse('2026-10-24T03:00:00Z'); } };` });
    await page("Page.navigate", { url: `http://127.0.0.1:${server.address().port}/index.html?role=landlord&view=residents` });
    for (let attempt = 0; attempt < 100; attempt++) {
      if (await evaluate("Boolean(window.__troday)")) break;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    assert.equal(await evaluate("Boolean(window.__troday)"), true);
    await evaluate(`document.querySelector('[data-action="move-out"][data-id="k2:o2"]').click()`);
    assert.equal(await evaluate(`document.querySelector('#app-dialog').open && document.querySelector('[name="successorId"]').value === 'o3'`), true);
    await evaluate(`document.querySelector('[name="consent"]').checked = true; document.querySelector('form[data-form="representative-handover"]').requestSubmit()`);
    assert.equal(await evaluate(`__troday.getState().contracts.find(c => c.id === 'k2').tenantId`), "ngoc");
    assert.equal(await evaluate(`document.querySelector('#app-main').textContent.includes('Đỗ Bích Ngọc') && !document.querySelector('[data-action="move-out"][data-id="k2:o2"]')`), true);
    await evaluate(`__troday.action('contract-detail', 'k2'); document.querySelector('[data-action="representative-history"]').click()`);
    assert.equal(await evaluate(`document.querySelector('#dialog-body').textContent.includes('Phạm Thu Mai') && document.querySelector('#dialog-body').textContent.includes('Đỗ Bích Ngọc')`), true);
    await evaluate(`document.querySelector('[data-action="close-dialog"]').click(); __troday.reset(); __troday.action('switch-role', 'landlord'); __troday.action('navigate', 'residents'); document.querySelector('[data-action="approve-join"]').click()`);
    assert.equal(await evaluate(`__troday.getState().joinRequests[0].status`), "APPROVED");
    assert.equal(await evaluate(`document.querySelector('#app-main').textContent.includes('Giữ đến')`), true);

    // Build a two-person contract using actual rendered forms and browser FormData.
    await evaluate(`__troday.action('switch-role', 'tenant'); __troday.action('agree-rent', 'v2'); __troday.action('switch-role', 'landlord'); __troday.action('open-contract', 'v2')`);
    await evaluate(`document.querySelector('[name="members"]').value = 'Bạn cùng phòng, 0123456789'; document.querySelector('form[data-form="create-contract"]').requestSubmit()`);
    const newId = await evaluate(`__troday.getState().selectedContract`);
    assert.equal(await evaluate(`__troday.getState().contracts.find(c => c.id === ${JSON.stringify(newId)}).members.length`), 2);
    await evaluate(`__troday.action('switch-role', 'tenant'); __troday.action('confirm-contract', ${JSON.stringify(newId)}); __troday.action('switch-role', 'landlord'); __troday.action('confirm-move-in', ${JSON.stringify(newId)})`);
    assert.equal(await evaluate(`document.querySelectorAll('[name="memberIds"]:checked').length`), 2);
    await page("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    assert.equal(await evaluate("document.documentElement.scrollWidth <= window.innerWidth"), true);
    await evaluate(`document.querySelector('form[data-form="move-in"]').requestSubmit()`);
    assert.equal(await evaluate(`__troday.getState().contracts.find(c => c.id === ${JSON.stringify(newId)}).members.every(m => m.status === 'ACTIVE')`), true);

    // Calendar uses Vietnam time while Chrome itself runs in Los Angeles time.
    await evaluate(`__troday.action('open-appointment', '')`);
    assert.equal(await evaluate(`document.querySelector('[name="date"]').value`), "2026-10-24");
    assert.equal(await evaluate(`document.querySelector('[name="time"]').value`), "10:30");
    await evaluate(`document.querySelector('[name="roomId"]').value = 'r1'; document.querySelector('form[data-form="appointment"]').requestSubmit()`);
    assert.equal(await evaluate(`__troday.getState().viewings.at(-1).startsAt`), "2026-10-24T03:30:00.000Z");
    const viewingId = await evaluate(`__troday.getState().viewings.at(-1).id`);
    await evaluate(`__troday.action('cancel-viewing', ${JSON.stringify(viewingId)}); document.querySelector('[name="reason"]').value = 'Đổi kế hoạch'; document.querySelector('form[data-form="cancel-viewing"]').requestSubmit()`);
    assert.equal(await evaluate(`__troday.getState().viewings.at(-1).status`), "CANCELLED");

    await evaluate(`__troday.action('cancel-contract', 'k1'); document.querySelector('[name="reason"]').value = 'Hai bên hủy'; document.querySelector('form[data-form="cancel-contract"]').requestSubmit(); __troday.action('switch-role', 'tenant'); __troday.action('navigate', 'viewings')`);
    await evaluate(`document.querySelector('[data-action="withdraw-rent"][data-id="v3"]').click()`);
    assert.equal(await evaluate(`__troday.getState().viewings.find(v => v.id === 'v3').decision`), "WITHDRAWN");

    // Viewings appear in their chat and share live state with the calendar.
    await page("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    await evaluate(`__troday.reset(); __troday.action('switch-role', 'landlord'); __troday.action('navigate', 'chats'); __troday.action('select-chat', 'c1')`);
    assert.equal(await evaluate(`document.querySelectorAll('.chat-viewing-card').length`), 3);
    assert.equal(await evaluate(`document.querySelector('.chat-pane-head .chat-person-name .pill').textContent`), "Người thuê");
    assert.equal(await evaluate(`document.querySelector('[data-viewing-id="v1"]').textContent.includes('17:00–18:00') && !document.querySelector('[data-viewing-id="v4"]')`), true);
    await evaluate(`document.querySelector('[data-action="open-appointment"]').click(); document.querySelector('[name="roomId"]').value = 'r1'; document.querySelector('[name="notes"]').value = 'Gặp tại cổng nhà trọ'; document.querySelector('form[data-form="appointment"]').requestSubmit()`);
    const chatViewingId = await evaluate(`__troday.getState().viewings.at(-1).id`);
    const chatViewingSelector = `[data-viewing-id="${chatViewingId}"]`;
    assert.equal(await evaluate(`__troday.getState().view === 'chats' && !document.querySelector('#app-dialog').open`), true);
    assert.equal(await evaluate(`document.querySelector(${JSON.stringify(chatViewingSelector)}).textContent.includes('10:30–11:30') && document.querySelector(${JSON.stringify(chatViewingSelector)}).textContent.includes('Gặp tại cổng nhà trọ')`), true);
    assert.equal(await evaluate(`(() => { const card = document.querySelector(${JSON.stringify(chatViewingSelector)}).getBoundingClientRect(); const log = document.querySelector('[role="log"]').getBoundingClientRect(); return card.top >= log.top && card.bottom <= log.bottom; })()`), true);
    await page("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    assert.equal(await evaluate(`document.querySelector('.chat-shell').classList.contains('thread-open') && document.documentElement.scrollWidth <= window.innerWidth`), true);
    assert.equal(await evaluate(`document.querySelector('.chat-composer').getBoundingClientRect().bottom <= window.innerHeight`), true);
    await evaluate(`document.querySelector('#chat-message').value = 'Mình đã nhận lịch hẹn.'; document.querySelector('#chat-message').dispatchEvent(new Event('input', { bubbles: true })); document.querySelector('form[data-form="chat-message"]').requestSubmit()`);
    const sentMessageBounds = await evaluate(`(() => { const message = document.querySelector('.chat-pane-body .message-row:last-of-type').getBoundingClientRect(); const log = document.querySelector('[role="log"]').getBoundingClientRect(); return { messageTop: message.top, messageBottom: message.bottom, logTop: log.top, logBottom: log.bottom }; })()`);
    assert.ok(sentMessageBounds.messageTop >= sentMessageBounds.logTop - 1 && sentMessageBounds.messageBottom <= sentMessageBounds.logBottom + 1, JSON.stringify(sentMessageBounds));
    await evaluate(`document.querySelector(${JSON.stringify(chatViewingSelector)}).querySelector('[data-action="cancel-viewing"]').click(); document.querySelector('[name="reason"]').value = 'Đổi kế hoạch xem phòng'; document.querySelector('form[data-form="cancel-viewing"]').requestSubmit()`);
    assert.equal(await evaluate(`document.querySelector(${JSON.stringify(chatViewingSelector)}).textContent.includes('Đã hủy') && document.querySelector(${JSON.stringify(chatViewingSelector)}).textContent.includes('Đổi kế hoạch xem phòng')`), true);
    await evaluate(`__troday.action('switch-role', 'tenant'); __troday.action('navigate', 'chats'); __troday.action('select-chat', 'c1')`);
    assert.equal(await evaluate(`document.querySelector(${JSON.stringify(chatViewingSelector)}).textContent.includes('Đã hủy') && !document.querySelector('.chat-viewing-card [data-action="confirm-attendance"]')`), true);
    await evaluate(`__troday.action('navigate', 'viewings')`);
    assert.equal(await evaluate(`document.querySelector('#app-main').textContent.includes('Đổi kế hoạch xem phòng')`), true);
    await evaluate(`__troday.action('navigate', 'chats'); __troday.action('select-chat', 'c1')`);
    assert.equal(await evaluate(`document.querySelectorAll(${JSON.stringify(chatViewingSelector)}).length`), 1);

    // Connection acceptance opens messaging, independently of rental consent.
    await page("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    await evaluate(`__troday.reset(); __troday.action('navigate', 'roommates')`);
    const beforeConnection = await evaluate(`JSON.stringify({ contracts: __troday.getState().contracts, joins: __troday.getState().joinRequests, rooms: __troday.getState().rooms })`);
    await evaluate(`document.querySelector('[data-action="accept-roommate"][data-id="rm1"]').closest('.roommate-row').querySelector('[data-action="roommate-profile"]').click()`);
    assert.equal(await evaluate(`document.querySelector('#app-dialog').open && document.querySelector('#dialog-body').textContent.includes('Lê Gia Bảo') && document.querySelector('#dialog-body').textContent.includes('Thói quen')`), true);
    assert.equal(await evaluate(`__troday.getState().roommateInvites.find(i => i.id === 'rm1').status`), "PENDING");
    await evaluate(`document.querySelector('#dialog-body [data-action="accept-roommate"]').click()`);
    const roommateChatId = await evaluate(`__troday.getState().selectedConversation`);
    assert.equal(await evaluate(`!document.querySelector('#app-dialog').open && __troday.getState().view === 'chats' && __troday.getState().conversations.find(c => c.id === ${JSON.stringify(roommateChatId)}).users.includes('bao')`), true);
    assert.equal(await evaluate(`document.querySelector('.chat-pane-head .chat-person-name .pill').textContent`), "Bạn ghép");
    assert.equal(await evaluate(`Array.from(document.querySelectorAll('.contact .chat-person-name .pill')).some(p => p.textContent === 'Chủ trọ')`), true);
    assert.equal(await evaluate(`!document.querySelector('[data-action="open-appointment"]') && !document.querySelector('#chat-room-context')`), true);
    assert.equal(await evaluate(`document.querySelectorAll('.chat-viewing-card').length`), 0);
    await evaluate(`document.querySelector('#chat-message').value = 'Chào Bảo, mình muốn trao đổi trước khi quyết định thuê chung.'; document.querySelector('#chat-message').dispatchEvent(new Event('input', { bubbles: true }))`);
    assert.equal(await evaluate(`document.querySelector('.chat-send').disabled`), false);
    await evaluate(`document.querySelector('form[data-form="chat-message"]').requestSubmit()`);
    assert.equal(await evaluate(`__troday.getState().conversations.find(c => c.id === ${JSON.stringify(roommateChatId)}).messages[0].roomId`), null);
    assert.equal(await evaluate(`document.querySelector('[role="log"]').textContent.includes('Chào Bảo')`), true);
    assert.equal(await evaluate(`JSON.stringify({ contracts: __troday.getState().contracts, joins: __troday.getState().joinRequests, rooms: __troday.getState().rooms })`), beforeConnection);

    // Share a live listing with a connected roommate, without changing rental state or the draft.
    await evaluate(`document.querySelector('#chat-message').value = 'Mình đang so sánh phòng'; document.querySelector('#chat-message').dispatchEvent(new Event('input', { bubbles: true })); document.querySelector('[data-action="share-post"]').click()`);
    assert.equal(await evaluate(`document.querySelector('#app-dialog').open && !Array.from(document.querySelector('[name="postId"]').options).some(o => o.value === 'r6')`), true);
    await evaluate(`document.querySelector('[name="postId"]').value = 'r2'; document.querySelector('[name="note"]').value = 'Cùng xem phòng này nhé'; document.querySelector('form[data-form="share-post"]').requestSubmit()`);
    assert.equal(await evaluate(`document.querySelector('#chat-message').value`), "Mình đang so sánh phòng");
    assert.equal(await evaluate(`document.querySelector('.shared-post-card').textContent.includes('P204') && __troday.getState().conversations.find(c => c.id === ${JSON.stringify(roommateChatId)}).messages.at(-1).messageType === 'POST_SHARE'`), true);
    assert.equal(await evaluate(`JSON.stringify({ contracts: __troday.getState().contracts, joins: __troday.getState().joinRequests, rooms: __troday.getState().rooms })`), beforeConnection);
    await evaluate(`document.querySelector('[data-action="shared-post-detail"]').click()`);
    assert.equal(await evaluate(`__troday.getState().view === 'detail' && __troday.getState().selectedRoom === 'r2'`), true);
    await evaluate(`document.querySelector('[data-action="return-shared-chat"]').click()`);
    assert.equal(await evaluate(`__troday.getState().selectedConversation`), roommateChatId);

    // Restore from real localStorage, then reopen the same connection on mobile.
    await page("Page.navigate", { url: `http://127.0.0.1:${server.address().port}/index.html?role=tenant&view=roommates&check=roommate-reload` });
    let reloaded = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      try { reloaded = await evaluate(`location.search.includes('check=roommate-reload') && Boolean(window.__troday) && document.readyState === 'complete'`); } catch { /* The old execution context may be destroyed during navigation. */ }
      if (reloaded) break;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    assert.equal(reloaded, true);
    await page("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    assert.equal(await evaluate(`document.documentElement.scrollWidth <= window.innerWidth`), true);
    await evaluate(`document.querySelector('[data-action="chat-roommate"][data-id="rm1"]').click()`);
    assert.equal(await evaluate(`__troday.getState().selectedConversation`), roommateChatId);
    assert.equal(await evaluate(`document.querySelector('.chat-shell').classList.contains('thread-open') && document.querySelector('[role="log"]').textContent.includes('Chào Bảo')`), true);
    assert.equal(await evaluate(`document.querySelectorAll('.shared-post-card').length === 1 && document.documentElement.scrollWidth <= window.innerWidth`), true);
    assert.equal(await evaluate(`document.querySelector('.chat-pane-body').scrollWidth <= document.querySelector('.chat-pane-body').clientWidth`), true);
    await evaluate(`__troday.getState().rooms.find(r => r.id === 'r2').postStatus = 'REJECTED'; __troday.action('chat-roommate', 'rm1')`);
    assert.equal(await evaluate(`Boolean(document.querySelector('.shared-post-unavailable')) && !document.querySelector('[data-action="shared-post-detail"]') && !document.querySelector('[role="log"]').textContent.includes('Phòng ban công thoáng')`), true);
    await evaluate(`__troday.getState().rooms.find(r => r.id === 'r2').postStatus = 'APPROVED'; __troday.action('chat-roommate', 'rm1')`);
    assert.equal(await evaluate(`document.querySelector('.chat-composer').getBoundingClientRect().bottom <= window.innerHeight`), true);
    await evaluate(`document.querySelector('[data-action="roommate-profile"]').click()`);
    assert.equal(await evaluate(`document.querySelector('#dialog-body').textContent.includes('Lê Gia Bảo')`), true);
    await evaluate(`document.querySelector('#dialog-body [data-action="chat-roommate"]').click()`);
    assert.equal(await evaluate(`__troday.getState().conversations.filter(c => c.roommateRequestId === 'rm1').length`), 1);
    await evaluate(`__troday.action('navigate', 'roommates'); document.querySelector('[data-action="accept-roommate"][data-id="rm2"]').closest('.roommate-row').querySelector('[data-action="roommate-profile"]').click()`);
    assert.equal(await evaluate(`document.querySelector('#dialog-body').textContent.includes('Phạm Thu Mai') && document.querySelector('#dialog-body').textContent.includes('P305') && !document.querySelector('#dialog-body').textContent.includes('001202')`), true);
    await evaluate(`document.querySelector('#dialog-body [data-action="accept-roommate"]').click()`);
    assert.equal(await evaluate(`__troday.getState().view === 'chats' && __troday.getState().conversations.find(c => c.id === __troday.getState().selectedConversation).users.includes('mai')`), true);
    assert.equal(await evaluate(`JSON.stringify({ contracts: __troday.getState().contracts, joins: __troday.getState().joinRequests, rooms: __troday.getState().rooms })`), beforeConnection);
    await evaluate(`__troday.action('navigate', 'roommates'); document.querySelector('[data-action="send-roommate"][data-id="ngoc"]').click()`);
    assert.equal(await evaluate(`document.querySelector('#app-main').textContent.includes('Lời mời đã gửi') && document.documentElement.scrollWidth <= window.innerWidth`), true);
    await evaluate(`document.querySelector('[data-action="edit-roommate-profile"]').click()`);
    assert.equal(await evaluate(`Boolean(document.querySelector('form[data-form="roommate-profile"]'))`), true);

    // Existing rooms must not be mistaken for a missing-room prerequisite.
    await evaluate(`document.querySelector('#dialog-body [data-action="close-dialog"]').click(); __troday.reset(); __troday.action('switch-role', 'landlord'); __troday.action('navigate', 'listings'); document.querySelector('[data-action="open-listing"]').click()`);
    assert.equal(await evaluate(`document.querySelector('#app-dialog').open && document.querySelector('#dialog-body').textContent.includes('5 phòng') && document.querySelectorAll('#dialog-body [data-action="edit-listing"]').length === 5`), true);
    assert.equal(await evaluate(`document.querySelector('#dialog-body').textContent.includes('Hãy thêm một phòng mới')`), false);
    await evaluate(`document.querySelector('#dialog-body [data-action="edit-listing"][data-id="r1"]').click()`);
    assert.equal(await evaluate(`document.querySelector('[name="roomId"]').value === 'r1' && document.querySelector('form[data-form="listing"]').checkValidity()`), true);
    await evaluate(`document.querySelector('[name="title"]').value = 'Tin cập nhật cho P101'; document.querySelector('form[data-form="listing"]').requestSubmit()`);
    assert.equal(await evaluate(`!document.querySelector('#app-dialog').open && __troday.getState().rooms.find(r => r.id === 'r1').postStatus === 'PENDING_REVIEW' && __troday.getState().rooms.filter(r => r.houseId === 'h1').length === 5`), true);

    // Rejected/hidden rooms can be resubmitted; choosing a room loads its own fields.
    await evaluate(`__troday.getState().rooms.find(r => r.id === 'r1').postStatus = 'REJECTED'; __troday.getState().rooms.find(r => r.id === 'r2').postStatus = 'HIDDEN'; __troday.action('navigate', 'listings')`);
    assert.equal(await evaluate(`document.querySelector('#app-main').textContent.includes('Bị từ chối') && document.querySelector('#app-main').textContent.includes('Đã ẩn')`), true);
    await evaluate(`document.querySelector('[data-action="open-listing"]').click(); document.querySelector('[name="roomId"]').value = 'r2'; document.querySelector('[name="roomId"]').dispatchEvent(new Event('change', { bubbles: true }))`);
    assert.equal(await evaluate(`document.querySelector('[name="title"]').value === __troday.getState().rooms.find(r => r.id === 'r2').title && document.querySelector('[name="photo"]').value === 'assets/r2.webp' && document.querySelector('[name="originalPostStatus"]').value === 'HIDDEN'`), true);
    assert.equal(await evaluate(`Array.from(document.querySelector('[name="roomId"]').options).every(o => ['r1','r2'].includes(o.value)) && document.documentElement.scrollWidth <= window.innerWidth`), true);
    await evaluate(`document.querySelector('form[data-form="listing"]').requestSubmit()`);
    assert.equal(await evaluate(`!document.querySelector('#app-dialog').open && __troday.getState().rooms.find(r => r.id === 'r2').postStatus === 'PENDING_REVIEW' && __troday.getState().rooms.filter(r => r.houseId === 'h1').length === 5`), true);
    assert.deepEqual(errors, []);
    console.log("Browser smoke passed: rental workflows, chat and post sharing, existing-room listing selection, listing edits and resubmission, bundled images, persistence and mobile layout; no runtime exceptions.");
    await call("Browser.close");
  } finally {
    socket?.close(); chrome?.kill();
    await new Promise((resolve) => server.close(resolve));
    // This is the unique temporary profile created above, never the user's browser profile.
    const absoluteProfile = path.resolve(profile);
    if (path.dirname(absoluteProfile) === path.resolve(os.tmpdir()) && path.basename(absoluteProfile).startsWith("troday-browser-")) {
      fs.rmSync(absoluteProfile, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    }
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
