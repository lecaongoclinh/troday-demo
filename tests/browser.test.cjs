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
    assert.equal(await evaluate(`document.querySelector('#app-dialog').open && !Array.from(document.querySelector('[name="postId"]').options).some(o => o.value === 'p-r6')`), true);
    await evaluate(`document.querySelector('[name="postId"]').value = 'p-r2'; document.querySelector('[name="note"]').value = 'Cùng xem phòng này nhé'; document.querySelector('form[data-form="share-post"]').requestSubmit()`);
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
    await evaluate(`__troday.getState().posts.find(p => p.id === 'p-r2').status = 'REJECTED'; __troday.action('chat-roommate', 'rm1')`);
    assert.equal(await evaluate(`Boolean(document.querySelector('.shared-post-unavailable')) && !document.querySelector('[data-action="shared-post-detail"]') && !document.querySelector('[role="log"]').textContent.includes('Phòng ban công thoáng')`), true);
    await evaluate(`__troday.getState().posts.find(p => p.id === 'p-r2').status = 'APPROVED'; __troday.action('chat-roommate', 'rm1')`);
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

    // Multiple independent posts can target the same existing room.
    await evaluate(`document.querySelector('#dialog-body [data-action="close-dialog"]').click(); __troday.reset(); __troday.action('switch-role', 'landlord'); __troday.action('navigate', 'listings'); document.querySelector('[data-action="open-listing"]').click()`);
    assert.equal(await evaluate(`document.querySelector('[name="roomId"]').options.length === 5 && Array.from(document.querySelector('[name="roomId"]').options).some(o=>o.value==='r1') && !Array.from(document.querySelector('[name="roomId"]').options).some(o=>o.value==='r4')`), true);
    await evaluate(`document.querySelector('[name="roomId"]').value='r1'; document.querySelector('[name="title"]').value='Bài mới cho P101'; document.querySelector('[name="description"]').value='Thông tin của riêng bài mới'; document.querySelector('form[data-form="listing"]').requestSubmit()`);
    const secondPost = await evaluate(`__troday.getState().posts.at(-1).id`);
    assert.equal(await evaluate(`__troday.getState().posts.find(p=>p.id==='p-r1').status==='APPROVED' && __troday.getState().posts.at(-1).status==='PENDING_REVIEW' && __troday.getState().rooms.filter(r=>r.houseId==='h1').length===5`),true);
    await evaluate(`document.querySelector('[data-action="open-listing"]').click(); document.querySelector('[name="roomId"]').value='r1'; document.querySelector('[name="title"]').value='Bài thứ ba P101'; document.querySelector('[name="description"]').value='Nội dung khác'; document.querySelector('form[data-form="listing"]').requestSubmit()`);
    const thirdPost = await evaluate(`__troday.getState().posts.at(-1).id`);
    assert.equal(await evaluate(`__troday.getState().posts.filter(p=>p.roomId==='r1' && p.status==='PENDING_REVIEW').length`),2);
    await evaluate(`__troday.action('switch-role','admin'); __troday.action('navigate','moderation'); document.querySelector('[data-action="approve-listing"][data-id="${secondPost}"]').click(); document.querySelector('[data-action="reject-listing"][data-id="${thirdPost}"]').click(); document.querySelector('[name="reason"]').value='Cần bổ sung ảnh'; document.querySelector('form[data-form="moderation-reason"]').requestSubmit()`);
    assert.equal(await evaluate(`__troday.getState().posts.find(p=>p.id==='${secondPost}').status==='APPROVED' && __troday.getState().posts.find(p=>p.id==='${thirdPost}').status==='REJECTED' && __troday.getState().posts.find(p=>p.id==='p-r1').status==='APPROVED'`),true);
    await evaluate(`__troday.action('switch-role','landlord'); __troday.action('navigate','listings'); document.querySelector('[data-action="edit-listing"][data-id="${secondPost}"]').click()`);
    assert.equal(await evaluate(`document.querySelector('[name="roomId"]').value==='r1' && document.querySelector('[name="photo"]').value==='assets/r1.webp' && document.querySelector('form[data-form="listing"]').checkValidity()`),true);
    await evaluate(`document.querySelector('[name="title"]').value='Tin P101 được cập nhật'; document.querySelector('form[data-form="listing"]').requestSubmit(); __troday.action('switch-role','admin'); __troday.action('navigate','moderation'); document.querySelector('[data-action="approve-listing"][data-id="${secondPost}"]').click(); __troday.action('switch-role','tenant'); __troday.action('navigate','discover')`);
    assert.equal(await evaluate(`Boolean(document.querySelector('.property-card[data-post-id="p-r1"]')) && Boolean(document.querySelector('.property-card[data-post-id="${secondPost}"]')) && document.documentElement.scrollWidth<=window.innerWidth`),true);
    await evaluate(`document.querySelector('[data-action="favorite"][data-id="${secondPost}"]').click(); document.querySelector('[data-action="favorite"][data-id="p-r1"]').click(); document.querySelector('[data-action="post-detail"][data-id="${secondPost}"]').click()`);
    assert.equal(await evaluate(`__troday.getState().favorites.includes('${secondPost}') && __troday.getState().favorites.includes('p-r1') && __troday.getState().selectedPost==='${secondPost}' && __troday.getState().selectedRoom==='r1' && document.querySelector('#app-main').textContent.includes('Thông tin của riêng bài mới')`),true);
    await evaluate(`document.querySelector('[data-action="report-post"]').click(); document.querySelector('[name="reason"]').value='Kiểm tra bài riêng này'; document.querySelector('form[data-form="report-post"]').requestSubmit()`);
    assert.equal(await evaluate(`__troday.getState().reports.at(-1).postId`),secondPost);
    await evaluate(`__troday.action('accept-roommate','rm1'); document.querySelector('[data-action="share-post"]').click(); document.querySelector('[name="postId"]').value='${secondPost}'; document.querySelector('form[data-form="share-post"]').requestSubmit()`);
    const exactPostChat = await evaluate(`__troday.getState().selectedConversation`);
    await evaluate(`document.querySelector('[data-action="shared-post-detail"]').click()`);
    assert.equal(await evaluate(`__troday.getState().selectedPost==='${secondPost}' && document.querySelector('#app-main').textContent.includes('Tin P101 được cập nhật')`),true);
    await evaluate(`__troday.action('switch-role','landlord'); __troday.action('hide-listing','${secondPost}'); document.querySelector('[name="reason"]').value='Tạm ẩn bài này'; document.querySelector('form[data-form="moderation-reason"]').requestSubmit(); __troday.action('switch-role','tenant'); __troday.action('navigate','chats'); __troday.action('select-chat','${exactPostChat}')`);
    assert.equal(await evaluate(`Boolean(document.querySelector('.shared-post-unavailable')) && __troday.getState().posts.find(p=>p.id==='p-r1').status==='APPROVED' && !document.querySelector('[role="log"]').textContent.includes('Tin P101 được cập nhật')`),true);

    // Tenant requests and owner-created appointments coexist, using actual mobile forms.
    await evaluate(`__troday.reset(); __troday.action('open-viewing-request', 'r1')`);
    assert.equal(await evaluate(`document.querySelector('form[data-form="viewing-request"]').checkValidity() && document.querySelector('[name="time"]').value === '10:30'`), true);
    await evaluate(`document.querySelector('[name="notes"]').value = 'Đề nghị gặp ở cổng'; document.querySelector('form[data-form="viewing-request"]').requestSubmit()`);
    const proposalId = await evaluate(`__troday.getState().viewingProposals.at(-1).id`);
    const proposalSelector = `[data-proposal-id="${proposalId}"]`;
    assert.equal(await evaluate(`__troday.getState().viewings.length === 4 && __troday.getState().viewingProposals.at(-1).status === 'PENDING' && __troday.getState().view === 'chats'`), true);
    assert.equal(await evaluate(`Boolean(document.querySelector(${JSON.stringify(proposalSelector)}).querySelector('[data-action="withdraw-viewing-proposal"]')) && document.documentElement.scrollWidth <= window.innerWidth`), true);
    await evaluate(`__troday.action('switch-role', 'landlord'); __troday.action('navigate', 'viewings')`);
    assert.equal(await evaluate(`Boolean(document.querySelector(${JSON.stringify(proposalSelector)}).querySelector('[data-action="accept-viewing-proposal"]'))`), true);
    await evaluate(`document.querySelector(${JSON.stringify(proposalSelector)}).querySelector('[data-action="accept-viewing-proposal"]').click()`);
    const approvedViewing = await evaluate(`__troday.getState().viewingProposals.at(-1).scheduledViewingId`);
    assert.equal(await evaluate(`__troday.getState().viewings.length === 5 && __troday.getState().viewings.at(-1).sourceProposalId === ${JSON.stringify(proposalId)}`), true);
    await evaluate(`__troday.action('switch-role', 'tenant'); __troday.action('navigate', 'chats'); __troday.action('select-chat', 'c1')`);
    assert.equal(await evaluate(`document.querySelector(${JSON.stringify(proposalSelector)}).textContent.includes('Đã chấp nhận') && document.querySelector('[data-viewing-id="${approvedViewing}"]').textContent.includes('10:30–11:30')`), true);
    assert.equal(await evaluate(`document.documentElement.scrollWidth <= window.innerWidth && document.querySelector('.chat-composer').getBoundingClientRect().bottom <= window.innerHeight`), true);

    await evaluate(`document.querySelector('[data-action="open-viewing-request"]').click(); document.querySelector('[name="roomId"]').value = 'r2'; document.querySelector('[name="time"]').value = '13:00'; document.querySelector('form[data-form="viewing-request"]').requestSubmit(); __troday.action('switch-role', 'landlord'); __troday.action('navigate', 'viewings')`);
    const rejectedProposal = await evaluate(`__troday.getState().viewingProposals.at(-1).id`);
    await evaluate(`document.querySelector('[data-action="reject-viewing-proposal"][data-id="${rejectedProposal}"]').click(); document.querySelector('[name="reason"]').value = 'Vui lòng chọn buổi chiều'; document.querySelector('form[data-form="reject-viewing-proposal"]').requestSubmit()`);
    assert.equal(await evaluate(`__troday.getState().viewingProposals.at(-1).status === 'REJECTED' && __troday.getState().viewings.length === 5`), true);
    await evaluate(`__troday.action('switch-role', 'tenant'); __troday.action('open-viewing-request', 'r2'); document.querySelector('[name="time"]').value = '14:00'; document.querySelector('form[data-form="viewing-request"]').requestSubmit()`);
    const withdrawnProposal = await evaluate(`__troday.getState().viewingProposals.at(-1).id`);
    await evaluate(`document.querySelector('[data-action="withdraw-viewing-proposal"][data-id="${withdrawnProposal}"]').click()`);
    assert.equal(await evaluate(`__troday.getState().viewingProposals.at(-1).status === 'WITHDRAWN' && __troday.getState().viewings.length === 5`), true);

    // The direct owner path still creates a confirmed schedule after exchanging messages.
    await evaluate(`__troday.action('switch-role', 'landlord'); __troday.action('navigate', 'chats'); __troday.action('select-chat', 'c1'); document.querySelector('[data-action="open-appointment"]').click(); document.querySelector('[name="roomId"]').value = 'r2'; document.querySelector('[name="time"]').value = '15:00'; document.querySelector('form[data-form="appointment"]').requestSubmit()`);
    assert.equal(await evaluate(`__troday.getState().viewings.length === 6 && __troday.getState().viewings.at(-1).createdBy === 'quan' && __troday.getState().viewings.at(-1).sourceProposalId === null && __troday.getState().viewingProposals.length === 3`), true);
    // Sending a contract closes upcoming room activity; expressing interest alone does not.
    await evaluate(`__troday.reset(); __troday.action('open-viewing-request', 'r2'); document.querySelector('[name="time"]').value = '13:00'; document.querySelector('form[data-form="viewing-request"]').requestSubmit()`);
    const closingProposal = await evaluate(`__troday.getState().viewingProposals.at(-1).id`);
    await evaluate(`__troday.action('switch-role', 'landlord'); __troday.action('navigate', 'chats'); __troday.action('select-chat', 'c1'); document.querySelector('[data-action="open-appointment"]').click(); document.querySelector('[name="roomId"]').value = 'r2'; document.querySelector('[name="time"]').value = '14:00'; document.querySelector('form[data-form="appointment"]').requestSubmit()`);
    const closingViewing = await evaluate(`__troday.getState().viewings.at(-1).id`);
    await evaluate(`__troday.action('switch-role', 'tenant'); __troday.action('agree-rent', 'v2')`);
    assert.equal(await evaluate(`__troday.getState().viewings.at(-1).status === 'SCHEDULED' && __troday.getState().viewingProposals.at(-1).status === 'PENDING' && __troday.getState().rooms.find(r => r.id === 'r2').status === 'AVAILABLE'`), true);
    await evaluate(`__troday.action('switch-role', 'landlord'); __troday.action('open-contract', 'v2')`);
    assert.equal(await evaluate(`document.querySelector('#dialog-body').textContent.includes('hủy 1 lịch xem sắp tới và đóng 1 đề nghị chờ') && document.documentElement.scrollWidth <= window.innerWidth`), true);
    await evaluate(`document.querySelector('form[data-form="create-contract"]').requestSubmit()`);
    const heldContract = await evaluate(`__troday.getState().selectedContract`);
    assert.equal(await evaluate(`__troday.getState().rooms.find(r => r.id === 'r2').status === 'RESERVED' && __troday.getState().viewings.at(-1).status === 'CANCELLED' && __troday.getState().viewingProposals.at(-1).status === 'REJECTED'`), true);
    await evaluate(`__troday.action('notifications', '')`);
    assert.equal(await evaluate(`document.querySelector('#dialog-body').textContent.includes('hủy 1 lịch sắp tới và đóng 1 đề nghị chờ')`), true);
    await evaluate(`document.querySelector('#dialog-body [data-action="close-dialog"]').click(); __troday.action('switch-role', 'tenant'); __troday.action('navigate', 'chats'); __troday.action('select-chat', 'c1')`);
    assert.equal(await evaluate(`document.querySelector('[data-viewing-id="${closingViewing}"]').textContent.includes('Phòng đã được giữ') && document.querySelector('[data-proposal-id="${closingProposal}"]').textContent.includes('Phòng đã được giữ')`), true);
    await evaluate(`__troday.action('notifications', '')`);
    assert.equal(await evaluate(`document.querySelector('#dialog-body').textContent.includes('lịch xem bị hủy') && document.querySelector('#dialog-body').textContent.includes('đề nghị xem phòng không được chấp nhận')`), true);
    await evaluate(`document.querySelector('#dialog-body [data-action="close-dialog"]').click(); __troday.action('confirm-contract', '${heldContract}')`);
    assert.equal(await evaluate(`__troday.getState().rooms.find(r => r.id === 'r2').status`), 'RESERVED');
    await evaluate(`__troday.action('switch-role', 'landlord'); __troday.action('cancel-contract', '${heldContract}'); document.querySelector('[name="reason"]').value = 'Hai bên hủy thỏa thuận'; document.querySelector('form[data-form="cancel-contract"]').requestSubmit()`);
    assert.equal(await evaluate(`__troday.getState().rooms.find(r => r.id === 'r2').status === 'AVAILABLE' && __troday.getState().viewings.at(-1).status === 'CANCELLED' && __troday.getState().viewingProposals.at(-1).status === 'REJECTED'`), true);
    await evaluate(`__troday.action('switch-role', 'tenant'); __troday.action('open-viewing-request', 'r2'); document.querySelector('[name="time"]').value = '16:00'; document.querySelector('form[data-form="viewing-request"]').requestSubmit()`);
    assert.equal(await evaluate(`__troday.getState().viewingProposals.at(-1).status === 'PENDING' && document.documentElement.scrollWidth <= window.innerWidth`), true);
    // Room detail lists its own posts and enforces three pending reviews per room.
    await evaluate(`__troday.reset(); __troday.action('switch-role','landlord'); __troday.action('navigate','properties'); document.querySelector('[data-action="room-detail"][data-id="r1"]').click()`);
    assert.equal(await evaluate(`__troday.getState().view==='room-detail' && document.querySelector('#app-main').textContent.includes('Thông tin phòng') && document.querySelectorAll('[data-related-post-id]').length===1 && document.querySelector('[data-room-quota]').textContent.includes('0/3')`),true);
    await evaluate(`document.querySelector('[data-action="room-post-detail"][data-id="p-r1"]').click()`);
    assert.equal(await evaluate(`__troday.getState().selectedPost==='p-r1' && document.querySelector('#app-main').textContent.includes('Quay lại chi tiết phòng')`),true);
    await evaluate(`document.querySelector('[data-action="room-detail"]').click()`);
    for(let index=0;index<3;index++) {
      await evaluate(`document.querySelector('[data-action="create-room-post"]').click(); document.querySelector('[name="title"]').value='Bài chờ P101 ${index}'; document.querySelector('[name="description"]').value='Nội dung bài ${index}'; document.querySelector('form[data-form="listing"]').requestSubmit()`);
      assert.equal(await evaluate(`__troday.getState().view==='room-detail' && __troday.getState().selectedRoom==='r1'`),true);
    }
    const pendingPost = await evaluate(`__troday.getState().posts.at(-1).id`);
    assert.equal(await evaluate(`document.querySelectorAll('[data-related-post-id]').length===4 && document.querySelector('[data-action="create-room-post"]').disabled && document.querySelector('[data-room-quota]').textContent.includes('3/3') && document.documentElement.scrollWidth<=window.innerWidth`),true);
    await evaluate(`document.querySelector('[data-action="edit-listing"][data-id="${pendingPost}"]').click()`);
    assert.equal(await evaluate(`!document.querySelector('form[data-form="listing"] button[type="submit"]').disabled`),true);
    await evaluate(`document.querySelector('[name="title"]').value='Bài chờ đã sửa khi đủ 3'; document.querySelector('form[data-form="listing"]').requestSubmit(); __troday.action('open-listing','')`);
    assert.equal(await evaluate(`document.querySelector('form[data-form="listing"] button[type="submit"]').disabled && document.querySelector('[data-listing-quota]').textContent.includes('3/3')`),true);
    await evaluate(`document.querySelector('[name="roomId"]').value='r2'; document.querySelector('[name="roomId"]').dispatchEvent(new Event('change',{bubbles:true}))`);
    assert.equal(await evaluate(`!document.querySelector('form[data-form="listing"] button[type="submit"]').disabled && document.querySelector('[data-listing-quota]').textContent.includes('0/3')`),true);
    await evaluate(`document.querySelector('[data-action="close-dialog"]').click(); __troday.action('switch-role','tenant'); __troday.action('room-detail','r1')`);
    assert.equal(await evaluate(`document.querySelectorAll('[data-related-post-id]').length===1 && !document.querySelector('[data-room-quota]') && !document.querySelector('[data-action="create-room-post"]') && !document.querySelector('#app-main').textContent.includes('Bài chờ P101')`),true);
    await evaluate(`__troday.action('switch-role','admin'); __troday.action('approve-listing','${pendingPost}'); __troday.action('switch-role','landlord'); __troday.action('room-detail','r1')`);
    assert.equal(await evaluate(`document.querySelector('[data-room-quota]').textContent.includes('2/3') && !document.querySelector('[data-action="create-room-post"]').disabled`),true);
    // Room details use live stays and services; public viewers see no resident identities.
    await evaluate(`__troday.reset(); __troday.action('switch-role','landlord'); __troday.action('navigate','properties'); document.querySelector('[data-action="room-detail"][data-id="r3"]').click()`);
    assert.equal(await evaluate(`document.querySelectorAll('.room-detail-tabs [role="tab"]').length===3 && document.querySelectorAll('[role="tabpanel"]:not([hidden])').length===1 && document.querySelector('[data-related-post-id]')!==null && !document.querySelector('[data-room-residents]') && !document.querySelector('[data-room-services]')`),true);
    await evaluate(`document.querySelector('#room-detail-tab-residents').click()`);
    assert.equal(await evaluate(`document.querySelectorAll('[data-room-resident-id]').length===2 && document.querySelector('[data-room-residents]').textContent.includes('Phạm Thu Mai') && document.querySelector('[data-room-residents]').textContent.includes('Đỗ Bích Ngọc') && document.querySelector('[data-room-resident-id="o2"]').textContent.includes('Đại diện hợp đồng')`),true);
    assert.equal(await evaluate(`!document.querySelector('[data-room-services]') && !document.querySelector('[data-related-post-id]')`),true);
    // Arrow keys, Home and End move selection and focus together.
    for (const [key, selected] of [["ArrowRight", "services"], ["Home", "posts"], ["End", "services"], ["ArrowRight", "posts"], ["ArrowLeft", "services"]]) {
      await page("Input.dispatchKeyEvent", { type: "keyDown", key, code: key });
      await page("Input.dispatchKeyEvent", { type: "keyUp", key, code: key });
      assert.equal(await evaluate(`document.activeElement.id==='room-detail-tab-${selected}' && document.activeElement.getAttribute('aria-selected')==='true' && document.querySelectorAll('[role="tabpanel"]:not([hidden])').length===1 && !document.querySelector('#room-detail-panel-${selected}').hidden`),true);
    }
    assert.equal(await evaluate(`document.querySelectorAll('[data-room-service-id]').length===4 && document.querySelector('[data-room-services]').textContent.includes('Theo đồng hồ') && document.querySelector('[data-room-services]').textContent.includes('Theo người') && document.querySelector('[data-room-services]').textContent.includes('Theo phòng') && document.documentElement.scrollWidth<=window.innerWidth`),true);
    await evaluate(`__troday.action('navigate','residents'); document.querySelector('[data-action="move-out"][data-id="k2:o2"]').click(); document.querySelector('[name="consent"]').checked=true; document.querySelector('form[data-form="representative-handover"]').requestSubmit(); __troday.action('room-detail','r3'); document.querySelector('#room-detail-tab-residents').click()`);
    assert.equal(await evaluate(`document.querySelectorAll('[data-room-resident-id]').length===1 && document.querySelector('[data-room-resident-id="o3"]').textContent.includes('Đại diện hợp đồng') && !document.querySelector('[data-room-residents]').textContent.includes('Phạm Thu Mai')`),true);
    await evaluate(`__troday.action('switch-role','tenant'); __troday.action('room-detail','r3')`);
    assert.equal(await evaluate(`document.querySelector('[data-room-residents]').textContent.includes('Phòng hiện có 1 người đang ở') && !document.querySelector('[data-room-resident-id]') && !document.querySelector('#app-main').textContent.includes('Đỗ Bích Ngọc') && !document.querySelector('#app-main').textContent.includes('001204') && !document.querySelector('[data-room-services]')`),true);
    await evaluate(`document.querySelector('#room-detail-tab-services').click()`);
    assert.equal(await evaluate(`document.querySelectorAll('[data-room-service-id]').length===4 && !document.querySelector('[data-room-residents]') && document.documentElement.scrollWidth<=window.innerWidth`),true);
    await evaluate(`__troday.action('switch-role','landlord'); __troday.action('room-detail','r2')`);
    assert.equal(await evaluate(`document.querySelector('[data-room-service-id="s3"]').textContent.includes('90.000 đ/phòng') && document.querySelector('[data-room-service-id="s3"]').textContent.includes('Giá riêng của phòng') && !document.querySelector('[data-room-service-id="s4"]') && document.documentElement.scrollWidth<=window.innerWidth`),true);
    await evaluate(`__troday.action('room-detail','r6')`);
    assert.equal(await evaluate(`document.querySelector('[data-room-services]').textContent.includes('Chưa có dịch vụ áp dụng') && !document.querySelector('[data-room-residents]')`),true);
    await evaluate(`document.querySelector('#room-detail-tab-residents').click()`);
    assert.equal(await evaluate(`document.querySelector('[data-room-residents]').textContent.includes('Chưa có người đang ở') && !document.querySelector('[data-room-services]')`),true);
    assert.deepEqual(errors, []);
    console.log("Browser smoke passed: rental workflows, independent posts, room detail tabs with keyboard navigation, residents and service prices, pending quota and role visibility, both viewing flows, contract cleanup, persistence and mobile layout; no runtime exceptions.");
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
