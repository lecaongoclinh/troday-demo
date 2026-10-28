const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createRuntime } = require('../src/runtime/runtime.cjs');
const { createDocument, NativeFormData } = require('../src/runtime/dom.cjs');

function setup(t, options = {}) {
  t.mock.timers.enable({ apis: ['Date'], now: Date.parse('2026-10-24T03:00:00Z') });
  const runtime = createRuntime(options);
  t.after(() => runtime.dispose()); return runtime;
}

test('native business bundle matches all three unmodified web sources', () => {
  const root = path.resolve(__dirname, '../..');
  const hash = crypto.createHash('sha256').update(['house-rights.js', 'business-guide.js', 'app.js'].map(file => fs.readFileSync(path.join(root, file), 'utf8')).join('\n')).digest('hex');
  assert.ok(fs.readFileSync(path.join(__dirname, '../src/generated/core.cjs'), 'utf8').includes(`Source SHA256: ${hash}`));
});

test('form port preserves implicit option values, multi-checkbox values and disabled fields', () => {
  const doc = createDocument('<form><select name="unit"><option>kWh</option><option>phòng</option></select><input type="checkbox" name="ids" value="a" checked><input type="checkbox" name="ids" value="b" checked><input name="skip" disabled value="x"></form>');
  const form = doc.querySelector('form');
  form.elements.unit.value = 'phòng';
  const data = new NativeFormData(form);
  assert.equal(data.get('unit'), 'phòng'); assert.deepEqual(data.getAll('ids'), ['a', 'b']); assert.equal(data.get('skip'), null);
});

test('both roles render all existing modules and room-detail tabs in the native port', t => {
  const r = setup(t);
  for (const role of ['tenant', 'landlord']) {
    r.action('switch-role', role);
    for (const [view] of r.core.nav[role]) { r.action('navigate', view); assert.ok(r.snapshot().main.textContent.length, `${role}/${view}`); }
    r.action('room-detail', 'r1');
    for (const tab of ['posts', 'residents', 'services']) { r.action('room-detail-tab', tab); assert.ok(r.snapshot().main.textContent.length); }
  }
});

test('tenant search, favorites and profile edits persist across app recreation', t => {
  let saved;
  const r = setup(t, { onPersist: value => saved = value });
  r.submitValues('filters', { query: 'ban công', area: 'Cầu Giấy', maxPrice: '5000000' });
  r.action('favorite', 'p-r1'); r.action('navigate', 'profile');
  r.submitValues('profile', { fullName: 'Lan Mobile', phone: '0900000000', email: 'lan@troday.vn', address: 'Hà Nội' });
  const next = createRuntime({ savedState: saved }); t.after(() => next.dispose());
  assert.equal(next.state().filters.query, 'ban công'); assert.ok(next.state().favorites.includes('p-r1'));
  assert.equal(next.core.person('lan').name, 'Lan Mobile');
});

test('native validation rejects empty required forms before touching business state', t => {
  const r = setup(t); r.action('switch-role', 'landlord'); r.action('open-house');
  const count = r.state().houses.length;
  assert.equal(r.submitValues('house', {}), false); assert.equal(r.state().houses.length, count);
  assert.match(r.snapshot().toast, /Vui lòng/); assert.ok(r.snapshot().dialog);
});

test('owner creates a draft house and room using the existing native form port', t => {
  const r = setup(t); r.action('switch-role', 'landlord'); r.action('open-house');
  const select = r.document.querySelector('[name="provinceCode"]');
  const province = select.querySelectorAll('option').find(o => o.textContent.includes('Hà Nội')).getAttribute('value');
  r.submitValues('house', { name: 'An Nhiên Mobile', address: '100 Nguyễn Trãi, Hà Nội', provinceCode: province, area: 'Thanh Xuân' });
  const h = r.state().houses.at(-1); assert.equal(h.ownerId, 'quan'); assert.equal(h.name, 'An Nhiên Mobile');
  r.action('open-room'); r.submitValues('room', { code: 'M101', area: 24, price: 4000000, deposit: 4000000, capacity: 2, status: 'AVAILABLE' });
  assert.equal(r.state().rooms.at(-1).houseId, h.id); assert.equal(r.state().rooms.at(-1).code, 'M101');
});

test('house verification changes required files and saves native picked documents', async t => {
  const proofs = new Map();
  const r = setup(t, { proofStore: { async save(entries, ownerId) { return entries.map(({ file, documentType }, index) => { const record = { ...file, id: `native-file-${index}`, ownerId, documentType }; proofs.set(record.id, record); return record; }); }, async remove() {}, async get(id) { return proofs.get(id); } } });
  r.action('switch-role', 'landlord'); r.action('open-house');
  r.submitValues('house', { name: 'Nhà mới', address: '10 Trần Duy Hưng, Hà Nội', provinceCode: '01', area: 'Cầu Giấy' });
  const h = r.state().houses.at(-1); r.action('submit-house-proof', h.id);
  const select = r.document.querySelector('[name="rightType"]');
  r.change(select, 'AUTHORIZED');
  assert.equal(r.document.querySelector('[name="validUntil"]').required, true);
  r.change(select, 'OWNER');
  const field = r.document.querySelector('[name="document_OWNER_PROOF"]');
  r.attach(field, [{ uri: 'file:///proof.pdf', name: 'proof.pdf', type: 'application/pdf', size: 1024 }]);
  await r.submitValues('house-verification', { scope: 'Toàn bộ nhà trọ tại địa chỉ khai báo' });
  assert.equal(r.state().houseVerifications.at(-1).houseId, h.id);
  assert.equal(r.state().houseVerifications.at(-1).status, 'PENDING'); assert.equal(proofs.size, 1);
});

test('chat selection, draft, native submit and back preserve conversation context', t => {
  const r = setup(t); r.action('navigate', 'chats'); r.action('select-chat', 'c1');
  const input = r.document.querySelector('#chat-message');
  r.change(input, 'Tin nhắn từ React Native');
  r.submit(r.document.querySelector('form[data-form="chat-message"]'));
  assert.equal(r.state().conversations.find(c => c.id === 'c1').messages.at(-1).text, 'Tin nhắn từ React Native');
  r.action('back-chats'); assert.equal(r.state().chatMobileOpen, false);
});

test('renewal still needs owner approval, tenant confirmation and owner application', t => {
  const r = setup(t), c = r.state().contracts.find(c => c.id === 'k4'), original = c.end;
  r.action('open-renewal', c.id); r.submitValues('change-request', { note: 'Gia hạn thêm một năm', effective: '2026-10-24', newEnd: '2028-09-30' });
  const change = r.state().changeRequests.at(-1); assert.equal(change.status, 'PENDING');
  r.action('switch-role', 'landlord'); r.action('approve-change', change.id);
  assert.equal(change.status, 'APPROVED_WAITING_CONFIRMATION'); assert.equal(c.end, original);
  r.action('switch-role', 'tenant'); r.action('accept-change', change.id);
  assert.equal(change.status, 'READY_TO_APPLY'); assert.equal(c.end, original);
  r.action('switch-role', 'landlord'); r.action('apply-change', change.id);
  assert.equal(change.status, 'COMPLETED'); assert.equal(c.end, '2028-09-30');
});

test('native checkbox selection confirms contract then records actual move-in', t => {
  const r = setup(t); r.action('confirm-contract', 'k1');
  assert.equal(r.state().contracts.find(c => c.id === 'k1').status, 'CONFIRMED');
  // The existing active stay must be closed before another move-in.
  r.action('switch-role', 'landlord'); r.action('move-out', 'k4:o5');
  r.action('confirm-move-in', 'k1');
  const form = r.document.querySelector('form[data-form="move-in"]'); assert.ok(form);
  r.submitValues('move-in', { date: '2026-10-24', memberIds: ['o1'] });
  assert.equal(r.state().contracts.find(c => c.id === 'k1').members[0].status, 'ACTIVE');
});

test('file export uses native sharing port with real resident CSV content', async t => {
  let exported;
  const r = setup(t, { onExport: async (blob, name) => { exported = { name, content: await blob.text() }; } });
  r.action('switch-role', 'landlord'); r.action('export-residents');
  await Promise.resolve();
  assert.match(exported.name, /danh-sach-cu-tru.*\.csv/); assert.match(exported.content, /Phạm Thu Mai/);
});

test('tenant room privacy and notification reads survive the native adapter', t => {
  const r = setup(t); r.action('room-detail', 'r3'); r.action('room-detail-tab', 'residents');
  assert.doesNotMatch(r.snapshot().main.textContent, /Đỗ Bích Ngọc/);
  r.state().notifications.push({ id: 'native-notice', userId: 'lan', text: 'Thông báo native', read: false });
  r.action('notifications'); r.action('read-notification', 'native-notice');
  assert.equal(r.state().notifications.at(-1).read, true);
});
