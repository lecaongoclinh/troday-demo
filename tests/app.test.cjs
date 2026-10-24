const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { test } = require("node:test");

// Exercise the real handlers with a fixed clock and an in-memory browser shell.
// No application logic is duplicated here; browser rendering is checked separately.
function demo(savedState) {
  let now = Date.parse("2026-10-24T03:00:00Z"); // 10:00 in Vietnam
  class Clock extends Date {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return now; }
  }
  const nodes = new Map();
  const node = (selector) => {
    if (!nodes.has(selector)) nodes.set(selector, { innerHTML: "", textContent: "", value: "", scrollHeight: 42, form: { querySelector: () => ({ disabled: false }) }, style: {}, classList: { add() {}, remove() {}, toggle() {} }, open: false, showModal() { this.open = true; }, close() { this.open = false; }, focus() {} });
    return nodes.get(selector);
  };
  const storage = new Map(savedState ? [["troday-wireframe-v5-20261023", JSON.stringify(savedState)]] : []);
  const context = vm.createContext({
    Date: Clock, Intl, structuredClone, URLSearchParams, URL,
    setTimeout: () => 1, clearTimeout() {},
    localStorage: { getItem: (key) => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) },
    document: { querySelector: node, querySelectorAll: () => [], addEventListener() {} },
    window: { scrollTo() {} }, location: { search: "" },
    FormData: class {
      constructor(form) { this.values = form.values; }
      get(key) { const value = this.values[key]; return Array.isArray(value) ? value[0] : value ?? null; }
      getAll(key) { const value = this.values[key]; return value == null ? [] : Array.isArray(value) ? value : [value]; }
    }
  });
  vm.runInContext(fs.readFileSync(`${__dirname}/../app.js`, "utf8"), context);
  const api = vm.runInContext("({ state: () => state, handleAction, handleForm, render, renderResidents, roomLoad, appointmentTimestamp, todayISO, openAppointment })", context);
  const state = api.state();
  state.role = "landlord"; state.view = "residents";
  return { state, api, node, action: api.handleAction, submit: (name, values) => api.handleForm({ dataset: { form: name }, values }), now: (value) => { now = Date.parse(value); } };
}
const byId = (items, id) => items.find((item) => item.id === id);
const viewingCard = (d, id) => d.node("#app-main").innerHTML.match(new RegExp('<article class="chat-viewing-card" data-viewing-id="' + id + '">([\\s\\S]*?)</article>'))?.[1] || "";
const k2 = (d) => byId(d.state.contracts, "k2");
const join = (d) => byId(d.state.joinRequests, "join1");
function change(d, type, extra = {}) {
  const request = { id: "change-test", contractId: "k2", status: "READY_TO_APPLY", type, effective: "2026-10-24", ...extra };
  d.state.changeRequests.push(request);
  return request;
}

test("one remaining resident is preselected for an explicit representative handover", () => {
  const d = demo(); d.action("move-out", "k2:o2");
  assert.equal(k2(d).status, "ACTIVE");
  assert.ok(k2(d).members.every((m) => m.status === "ACTIVE"));
  assert.match(d.api.renderResidents(), /Đỗ Bích Ngọc/);
  assert.match(d.node("#dialog-body").innerHTML, /hệ thống đã chọn sẵn/);
  assert.match(d.node("#dialog-body").innerHTML, /value="o3"/);
  d.submit("representative-handover", { contractId: "k2", departingId: "o2", successorId: "o3", reason: "Mai rời phòng", consent: "yes" });
  assert.equal(k2(d).tenantId, "ngoc"); assert.equal(k2(d).representativeId, "o3");
  assert.equal(k2(d).members[0].status, "LEFT"); assert.equal(k2(d).members[1].status, "ACTIVE");
  assert.equal(k2(d).status, "ACTIVE"); assert.equal(byId(d.state.rooms, "r3").status, "OCCUPIED");
  assert.equal(k2(d).representativeHistory.length, 2);
  assert.equal(k2(d).representativeHistory[0].toAt, k2(d).representativeHistory[1].fromAt);
  assert.equal(k2(d).representativeHistory[1].consentRecordedBy, "quan");
});
test("multiple eligible residents require choosing one, without silently assigning", () => {
  const d = demo(); k2(d).members.push({ id: "o-bao", tenantId: "bao", name: "Bảo", status: "ACTIVE", moveIn: "2026-10-23" });
  d.action("move-out", "k2:o2"); assert.match(d.node("#dialog-body").innerHTML, /Chọn một người đang ở/);
  d.submit("representative-handover", { contractId: "k2", departingId: "o2", successorId: "", reason: "Rời", consent: "yes" });
  assert.equal(k2(d).tenantId, "mai");
  d.submit("representative-handover", { contractId: "k2", departingId: "o2", successorId: "o-bao", reason: "Bảo nhận đại diện", consent: "yes" });
  assert.equal(k2(d).tenantId, "bao"); assert.equal(k2(d).members[1].status, "ACTIVE");
});
test("handover requires recorded consent and rejects planned, foreign or locked successors atomically", () => {
  for (const kind of ["no-consent", "planned", "foreign", "locked"]) {
    const d = demo();
    if (kind === "planned") k2(d).members[1].status = "PLANNED";
    if (kind === "locked") d.state.lockedUsers = ["ngoc"];
    const before = JSON.stringify(k2(d));
    d.submit("representative-handover", { contractId: "k2", departingId: "o2", successorId: kind === "foreign" ? "o1" : "o3", reason: "Bàn giao", consent: kind === "no-consent" ? "" : "yes" });
    assert.equal(JSON.stringify(k2(d)), before, kind);
  }
});
test("handover rechecks permissions and contract state at submission", () => {
  for (const kind of ["tenant", "closed", "stale"]) {
    const d = demo(); d.action("move-out", "k2:o2");
    if (kind === "tenant") d.state.role = "tenant";
    if (kind === "closed") k2(d).status = "TERMINATED";
    if (kind === "stale") k2(d).members[1].status = "LEFT";
    d.submit("representative-handover", { contractId: "k2", departingId: "o2", successorId: "o3", reason: "Bàn giao", consent: "yes" });
    assert.equal(k2(d).tenantId, "mai", kind); assert.equal(k2(d).members[0].status, "ACTIVE", kind);
  }
});
test("history survives reload, repeated submission and multiple successive handovers", () => {
  const d = demo(); const values = { contractId: "k2", departingId: "o2", successorId: "o3", reason: "Ngọc tiếp quản", consent: "yes" };
  d.submit("representative-handover", values); d.submit("representative-handover", values);
  assert.equal(k2(d).representativeHistory.length, 2);
  const reload = demo(d.state); assert.equal(k2(reload).representativeHistory.length, 2);
  assert.equal(k2(reload).representativeHistory[0].fromAt, null);
  k2(reload).members.push({ id: "o-bao", tenantId: "bao", name: "Bảo", status: "ACTIVE", moveIn: "2026-10-24" });
  reload.now("2026-10-24T04:00:00Z");
  reload.submit("representative-handover", { contractId: "k2", departingId: "o3", successorId: "o-bao", reason: "Bảo tiếp quản", consent: "yes" });
  assert.equal(k2(reload).representativeHistory.length, 3);
  assert.equal(k2(reload).representativeHistory.filter((h) => !h.ended).length, 1);
  reload.action("representative-history", "k2");
  assert.match(reload.node("#dialog-body").innerHTML, /Phạm Thu Mai/); assert.match(reload.node("#dialog-body").innerHTML, /Đỗ Bích Ngọc/);
});
test("handover cancels old consents but preserves issued bills and signed revisions", () => {
  const d = demo(); d.action("approve-join", "join1");
  const bills = JSON.stringify(d.state.invoices); const revisions = JSON.stringify(k2(d).revisions);
  d.submit("representative-handover", { contractId: "k2", departingId: "o2", successorId: "o3", reason: "Bàn giao", consent: "yes" });
  assert.equal(join(d).status, "CANCELLED"); assert.equal(d.state.changeRequests[0].status, "CANCELLED");
  assert.equal(JSON.stringify(d.state.invoices), bills); assert.equal(JSON.stringify(k2(d).revisions), revisions);
  assert.equal(d.state.notifications.filter((n) => n.contractId === "k2").length, 2);
  d.submit("invoice", { contractId: "k2", period: "2026-11", due: "2026-11-28", other: "0", discount: "0" });
  assert.equal(d.state.invoices.at(-1).payerId, "ngoc");
  d.state.view = "contracts"; d.state.selectedContract = "k2"; d.api.render();
  assert.match(d.node("#app-main").innerHTML, /Đã hủy/);
});
test("the final successor's departure closes their tenure without losing earlier history", () => {
  const d = demo(); d.submit("representative-handover", { contractId: "k2", departingId: "o2", successorId: "o3", reason: "Bàn giao", consent: "yes" });
  const first = JSON.stringify(k2(d).representativeHistory[0]);
  d.now("2026-10-24T04:00:00Z"); d.action("move-out", "k2:o3");
  assert.equal(k2(d).status, "TERMINATED");
  assert.ok(k2(d).representativeHistory.every((entry) => entry.ended));
  assert.equal(k2(d).representativeHistory[1].toAt, "2026-10-24T04:00:00.000Z");
  assert.equal(JSON.stringify(k2(d).representativeHistory[0]), first);
});
test("an old representative's invitation can connect without reusing rental consent after handover", () => {
  const d = demo(); d.submit("representative-handover", { contractId: "k2", departingId: "o2", successorId: "o3", reason: "Bàn giao", consent: "yes" });
  d.state.role = "tenant"; const before = d.state.joinRequests.length;
  d.action("accept-roommate", "rm2");
  assert.equal(d.state.joinRequests.length, before);
  assert.equal(byId(d.state.roommateInvites, "rm2").status, "ACCEPTED");
  assert.equal(d.state.view, "chats");
  assert.ok(d.state.conversations.find((c) => c.id === d.state.selectedConversation).users.includes("mai"));
});
test("new-rental handover preserves the original viewing tenant", () => {
  const d = demo(); const c = byId(d.state.contracts, "k1");
  byId(d.state.rooms, "r5").capacity = 2; c.status = "ACTIVE"; c.members[0].status = "ACTIVE";
  c.members.push({ id: "o-bao", tenantId: "bao", name: "Bảo", status: "ACTIVE", moveIn: "2026-10-24" });
  d.submit("representative-handover", { contractId: "k1", departingId: "o1", successorId: "o-bao", reason: "Bảo tiếp quản", consent: "yes" });
  assert.equal(c.tenantId, "bao"); assert.equal(c.viewingTenantId, "lan");
  assert.equal(byId(d.state.viewings, "v3").tenantId, "lan");
  d.state.role = "tenant"; d.state.view = "contracts"; d.state.selectedContract = "k1"; d.api.render();
  assert.match(d.node("#app-main").innerHTML, /HD-2026-041/);
  assert.doesNotMatch(d.node("#app-main").innerHTML, /data-action="open-change"/);
});
test("a regular member may leave without closing the contract", () => {
  const d = demo(); d.action("move-out", "k2:o3");
  assert.equal(k2(d).status, "ACTIVE");
  assert.equal(k2(d).members[1].moveOut, "2026-10-24");
  assert.equal(k2(d).members[1].moveOutConfirmedBy, "quan");
});
test("last departure closes the contract and cancels open joins", () => {
  const d = demo(); d.action("move-out", "k2:o3"); d.action("move-out", "k2:o2");
  assert.equal(k2(d).status, "TERMINATED");
  assert.equal(join(d).status, "CANCELLED");
  assert.equal(byId(d.state.rooms, "r3").status, "AVAILABLE");
});
test("old inconsistent saved data retains Ngoc and marks the room occupied", () => {
  const original = demo(); k2(original).status = "TERMINATED";
  k2(original).members[0].status = "LEFT";
  byId(original.state.rooms, "r3").status = "AVAILABLE";
  const d = demo(original.state);
  assert.equal(byId(d.state.rooms, "r3").status, "OCCUPIED");
  assert.match(d.api.renderResidents(), /Đỗ Bích Ngọc/);
  assert.match(d.api.renderResidents(), /Cần đối soát/);
});
test("two occupants plus one reservation block a second approval", () => {
  const d = demo(); d.action("approve-join", "join1");
  d.state.joinRequests.push({ ...join(d), id: "join2", applicantId: "lan", status: "PENDING_LANDLORD" });
  d.action("approve-join", "join2");
  assert.equal(join(d).status, "APPROVED");
  assert.equal(byId(d.state.joinRequests, "join2").status, "PENDING_LANDLORD");
  assert.equal(d.api.roomLoad("r3"), 3);
});
test("planned initial members consume capacity too", () => {
  const d = demo(); k2(d).members.push({ id: "planned", name: "Dự kiến", status: "PLANNED" });
  d.action("approve-join", "join1"); assert.equal(join(d).status, "PENDING_LANDLORD");
});
test("approval expires after 48 hours and cannot complete", () => {
  const d = demo(); d.action("approve-join", "join1");
  d.now("2026-10-26T03:00:00Z"); d.action("complete-join", "join1");
  assert.equal(join(d).status, "EXPIRED"); assert.equal(k2(d).members.length, 2);
});
test("old approvals lacking expiry release their unbounded hold", () => {
  const original = demo(); join(original).status = "APPROVED";
  const d = demo(original.state); assert.equal(join(d).status, "EXPIRED");
});
for (const status of ["TERMINATED", "EXPIRED", "CANCELLED", "CONFIRMED"]) {
  test(`approved join cannot move into a ${status} contract`, () => {
    const d = demo(); d.action("approve-join", "join1"); k2(d).status = status;
    d.action("complete-join", "join1");
    assert.equal(k2(d).members.length, 2); assert.equal(join(d).status, "APPROVED");
  });
}
test("join completion is linked to one stay and is idempotent", () => {
  const d = demo(); d.action("approve-join", "join1"); d.action("complete-join", "join1"); d.action("complete-join", "join1");
  assert.equal(k2(d).members.length, 3); assert.equal(join(d).status, "COMPLETED");
  const member = byId(k2(d).members, join(d).completedRoomTenantId);
  assert.equal(member.joinRequestId, "join1"); assert.equal(member.moveInConfirmedBy, "quan");
});
test("room capacity cannot be reduced below people and holds", () => {
  const d = demo(); d.action("approve-join", "join1");
  d.submit("room", { roomId: "r3", code: "P305", area: "30", price: "5400000", deposit: "5400000", capacity: "2", status: "OCCUPIED" });
  assert.equal(byId(d.state.rooms, "r3").capacity, 3);
});
test("initial occupants can all move in or arrive separately", () => {
  const d = demo(); const c = byId(d.state.contracts, "k1");
  byId(d.state.rooms, "r5").capacity = 2;
  c.status = "CONFIRMED"; c.revisionStatus = "CONFIRMED";
  c.members.push({ id: "extra", tenantId: null, name: "Bạn ở cùng", status: "PLANNED", moveIn: "" });
  d.submit("move-in", { contractId: "k1", date: "2026-10-24", memberIds: ["o1"] });
  assert.equal(c.status, "ACTIVE"); assert.equal(c.members[1].status, "PLANNED");
  assert.match(d.api.renderResidents(), /Bạn ở cùng/);
  d.submit("move-in", { contractId: "k1", date: "2026-10-24", memberIds: ["extra"] });
  assert.ok(c.members.every((m) => m.status === "ACTIVE"));
});
test("activation requires the representative and validates the entire selection before writing", () => {
  const d = demo(); const c = byId(d.state.contracts, "k1"); c.status = "CONFIRMED"; c.revisionStatus = "CONFIRMED";
  byId(d.state.rooms, "r5").capacity = 2;
  c.members.push({ id: "extra", tenantId: "ngoc", name: "Ngọc", status: "PLANNED" });
  d.submit("move-in", { contractId: "k1", date: "2026-10-24", memberIds: ["extra"] });
  assert.equal(c.status, "CONFIRMED");
  d.submit("move-in", { contractId: "k1", date: "2026-10-24", memberIds: ["o1", "extra"] });
  assert.ok(c.members.every((m) => m.status === "PLANNED"));
});
test("a group can move in in one confirmation", () => {
  const d = demo(); const c = byId(d.state.contracts, "k1"); c.status = "CONFIRMED"; c.revisionStatus = "CONFIRMED";
  byId(d.state.rooms, "r5").capacity = 2;
  c.members.push({ id: "extra", tenantId: null, name: "Bạn ở cùng", status: "PLANNED" });
  d.submit("move-in", { contractId: c.id, date: "2026-10-24", memberIds: ["o1", "extra"] });
  assert.equal(c.status, "ACTIVE"); assert.ok(c.members.every((m) => m.status === "ACTIVE"));
});
test("termination records departure dates and cancels planned people and joins", () => {
  const d = demo(); k2(d).members.push({ id: "extra", status: "PLANNED" });
  change(d, "TERMINATION"); d.action("apply-change", "change-test");
  assert.equal(k2(d).status, "TERMINATED");
  assert.ok(k2(d).members.slice(0, 2).every((m) => m.status === "LEFT" && m.moveOut === "2026-10-24" && m.moveOutConfirmedAt));
  assert.equal(k2(d).members[2].status, "CANCELLED"); assert.equal(join(d).status, "CANCELLED");
});
test("transfer carries all open members, preserves history, and then supports group arrival", () => {
  const d = demo(); const request = change(d, "TRANSFER", { targetRoomId: "r1" });
  d.action("apply-change", request.id);
  const next = byId(d.state.contracts, request.resultContractId);
  assert.equal(next.members.length, 2); assert.equal(next.previousContractId, "k2");
  assert.ok(k2(d).members.every((m) => m.status === "LEFT" && m.moveOut === "2026-10-24"));
  assert.ok(next.members.every((m) => m.status === "PLANNED" && !m.moveOut && !m.moveInConfirmedAt && !m.joinRequestId));
  d.submit("move-in", { contractId: next.id, date: "2026-10-24", memberIds: next.members.map((m) => m.id) });
  assert.equal(next.status, "ACTIVE"); assert.ok(next.members.every((m) => m.status === "ACTIVE"));
});
test("transfer to a room too small makes no partial changes", () => {
  const d = demo(); byId(d.state.rooms, "r1").capacity = 1;
  const before = JSON.stringify(d.state.contracts); const request = change(d, "TRANSFER", { targetRoomId: "r1" });
  d.action("apply-change", request.id);
  assert.equal(JSON.stringify(d.state.contracts), before); assert.equal(request.status, "READY_TO_APPLY");
});
test("closing cannot place move-out before any member's move-in", () => {
  const d = demo(); k2(d).members[1].moveIn = "2026-10-24";
  const request = change(d, "TERMINATION", { effective: "2026-10-23" }); d.action("apply-change", request.id);
  assert.equal(k2(d).status, "ACTIVE");
});
test("viewing times are Vietnam times even when the host timezone is different", () => {
  const d = demo(); assert.equal(d.api.appointmentTimestamp("2026-10-24", "10:00"), Date.parse("2026-10-24T03:00:00Z"));
  d.now("2026-10-24T18:30:00Z"); assert.equal(d.api.todayISO(), "2026-10-25");
  assert.ok(Number.isNaN(d.api.appointmentTimestamp("2026-02-30", "10:00")));
  d.api.openAppointment(); assert.match(d.node("#dialog-body").innerHTML, /value="02:00"/);
});
test("past times today are rejected; actual intervals and overlap boundaries are respected", () => {
  const d = demo(); const values = { conversationId: "c1", roomId: "r1", date: "2026-10-24", time: "09:00", duration: "60" };
  const count = d.state.viewings.length; d.submit("appointment", values); assert.equal(d.state.viewings.length, count);
  d.submit("appointment", { ...values, time: "10:30", duration: "30" });
  assert.equal(d.state.viewings.length, count + 1);
  assert.equal(d.state.viewings.at(-1).startsAt, "2026-10-24T03:30:00.000Z");
  d.submit("appointment", { ...values, time: "10:45" }); assert.equal(d.state.viewings.length, count + 1);
  d.submit("appointment", { ...values, time: "11:00" }); assert.equal(d.state.viewings.length, count + 2);
});
test("attendance and no-show cannot be recorded ahead of their time", () => {
  const d = demo(); const v = byId(d.state.viewings, "v1"); v.date = "2026-10-24"; v.time = "11:00";
  d.action("confirm-attendance", "v1"); assert.equal(v.status, "SCHEDULED");
  d.action("no-show", "v1"); assert.equal(v.status, "SCHEDULED");
  d.now("2026-10-24T05:00:00Z"); d.action("no-show", "v1"); assert.equal(v.status, "NO_SHOW");
});
test("cancelling a viewing records the actor and reason and frees the interval", () => {
  const d = demo(); d.submit("cancel-viewing", { viewingId: "v1", reason: "Đổi kế hoạch" });
  const v = byId(d.state.viewings, "v1"); assert.equal(v.status, "CANCELLED"); assert.equal(v.cancelledBy, "quan"); assert.ok(v.cancelledAt);
});
test("withdrawal is blocked by a live contract and allowed after its cancellation", () => {
  const d = demo(); d.state.role = "tenant"; d.action("withdraw-rent", "v3");
  assert.equal(byId(d.state.viewings, "v3").decision, "AGREED");
  d.state.role = "landlord"; d.submit("cancel-contract", { contractId: "k1", reason: "Hai bên đồng ý hủy" });
  assert.equal(byId(d.state.contracts, "k1").members[0].status, "CANCELLED");
  d.state.role = "tenant"; d.action("withdraw-rent", "v3");
  assert.equal(byId(d.state.viewings, "v3").decision, "WITHDRAWN"); assert.ok(byId(d.state.viewings, "v3").rentalWithdrawnAt);
});
test("new contract rejects more initial members than the room allows", () => {
  const d = demo(); byId(d.state.viewings, "v2").decision = "AGREED";
  const count = d.state.contracts.length;
  d.submit("create-contract", { viewingId: "v2", start: "2026-10-24", end: "2027-10-24", rent: "4200000", deposit: "4200000", members: "A, 123\nB, 456\nC, 789", terms: "Thỏa thuận" });
  assert.equal(d.state.contracts.length, count);
});

test("accepting a connection opens a two-person chat without creating rental consent or occupancy", () => {
  for (const inviteId of ["rm1", "rm2"]) {
    const d = demo(); d.state.role = "tenant";
    // Even a full room and closed contract must not block connecting to a person.
    k2(d).status = "TERMINATED"; byId(d.state.rooms, "r3").capacity = 2;
    d.api.render();
    const before = JSON.stringify({ contracts: d.state.contracts, joins: d.state.joinRequests, rooms: d.state.rooms });
    d.action("accept-roommate", inviteId);
    const invite = byId(d.state.roommateInvites, inviteId);
    assert.equal(invite.status, "ACCEPTED"); assert.ok(invite.respondedAt);
    assert.equal(d.state.view, "chats"); assert.equal(d.state.chatMobileOpen, true); assert.equal(d.state.chatContext, null);
    const conversation = byId(d.state.conversations, d.state.selectedConversation);
    assert.equal(conversation.type, "ROOMMATE"); assert.equal(conversation.roommateRequestId, invite.id);
    assert.deepEqual(Array.from(conversation.users).sort(), [invite.senderId, invite.receiverId].sort());
    assert.equal(conversation.messages.length, 0);
    assert.equal(JSON.stringify({ contracts: d.state.contracts, joins: d.state.joinRequests, rooms: d.state.rooms }), before);
    assert.doesNotMatch(d.node("#app-main").innerHTML, /Hẹn xem|id="chat-room-context"/);
  }
});

test("accepted connections send messages without inheriting room context and survive reload", () => {
  const d = demo(); d.state.role = "tenant"; d.action("accept-roommate", "rm1");
  const id = d.state.selectedConversation; const conversation = byId(d.state.conversations, id);
  d.state.chatContext = "r2";
  d.submit("chat-message", { message: "Chào Bảo, mình muốn tìm hiểu thêm trước khi quyết định." });
  assert.equal(conversation.messages.length, 1); assert.equal(conversation.messages[0].roomId, null);
  assert.equal(conversation.messages[0].senderId, "lan");
  conversation.messages.push({ id: "reply", senderId: "bao", roomId: null, text: "Chào Lan, mình cùng trao đổi nhé.", time: "10:01" });
  d.state.chatDrafts["lan:" + id] = "Bạn muốn tìm khu vực nào?";
  d.action("chat-roommate", "rm1");
  assert.match(d.node("#app-main").innerHTML, /Chào Bảo/); assert.match(d.node("#app-main").innerHTML, /Chào Lan/);
  assert.equal(d.state.chatDrafts["lan:" + id], "Bạn muốn tìm khu vực nào?");
  const restored = demo(d.state); restored.state.role = "tenant"; restored.action("chat-roommate", "rm1");
  assert.equal(restored.state.selectedConversation, id);
  assert.equal(restored.state.conversations.filter((c) => c.roommateRequestId === "rm1").length, 1);
  assert.equal(byId(restored.state.conversations, id).messages.length, 2);
  const count = restored.state.conversations.length;
  restored.action("accept-roommate", "rm1"); restored.action("send-roommate", "bao");
  assert.equal(restored.state.conversations.length, count);
});

test("only the recipient accepts or rejects and only connected participants can open or send", () => {
  const d = demo(); const before = JSON.stringify(d.state.roommateInvites);
  d.action("accept-roommate", "rm1"); d.action("reject-roommate", "rm1");
  assert.equal(JSON.stringify(d.state.roommateInvites), before);
  d.state.role = "tenant";
  d.action("chat-roommate", "rm1");
  assert.equal(d.state.conversations.some((c) => c.type === "ROOMMATE"), false);
  d.state.roommateInvites.push({ id: "foreign", senderId: "mai", receiverId: "bao", status: "PENDING" });
  d.action("accept-roommate", "foreign"); d.action("reject-roommate", "foreign");
  assert.equal(byId(d.state.roommateInvites, "foreign").status, "PENDING");
  d.action("accept-roommate", "rm1");
  const c = byId(d.state.conversations, d.state.selectedConversation);
  byId(d.state.roommateInvites, "rm1").endedAt = "2026-10-24T03:00:00Z";
  d.submit("chat-message", { message: "Không được gửi sau khi kết nối đã kết thúc" });
  assert.equal(c.messages.length, 0);
  d.action("reject-roommate", "rm1"); assert.equal(byId(d.state.roommateInvites, "rm1").status, "ACCEPTED");
});

test("one open invitation per pair blocks reverse invitations and merges legacy crossed invitations", () => {
  const d = demo(); d.state.role = "tenant";
  const count = d.state.roommateInvites.length;
  d.action("send-roommate", "bao"); assert.equal(d.state.roommateInvites.length, count);
  assert.equal(byId(d.state.roommateInvites, "rm1").status, "PENDING");
  d.action("send-roommate", "ngoc"); const sent = d.state.roommateInvites.at(-1);
  d.action("send-roommate", "ngoc"); assert.equal(d.state.roommateInvites.length, count + 1);
  d.action("send-roommate", "lan"); assert.equal(d.state.roommateInvites.length, count + 1);
  d.state.roommateInvites.push({ id: "crossed", senderId: "lan", receiverId: "bao", status: "PENDING" });
  d.action("accept-roommate", "rm1");
  assert.equal(byId(d.state.roommateInvites, "crossed").status, "CANCELLED");
  assert.equal(byId(d.state.roommateInvites, "rm1").status, "ACCEPTED");
  assert.equal(sent.status, "PENDING");
  const chats = d.state.conversations.length; d.action("send-roommate", "bao");
  assert.equal(d.state.conversations.length, chats);
});

test("legacy accepted connections are reused when accepting a duplicate pending invitation", () => {
  const d = demo(); d.state.role = "tenant";
  d.state.roommateInvites.push({ id: "older-accepted", senderId: "lan", receiverId: "bao", status: "ACCEPTED" });
  d.action("accept-roommate", "rm1");
  assert.equal(byId(d.state.roommateInvites, "rm1").status, "CANCELLED");
  assert.equal(byId(d.state.conversations, d.state.selectedConversation).roommateRequestId, "older-accepted");
});

test("invitation profiles show shared criteria without disclosing resident identity details", () => {
  const d = demo(); d.state.role = "tenant"; d.action("navigate", "roommates");
  assert.match(d.node("#app-main").innerHTML, /data-action="roommate-profile" data-id="mai"/);
  d.action("roommate-profile", "mai");
  const html = d.node("#dialog-body").innerHTML;
  assert.match(html, /Phạm Thu Mai/); assert.match(html, /Ngân sách/); assert.match(html, /Thói quen/); assert.match(html, /P305/);
  assert.doesNotMatch(html, /001202|2002-06-15/);
  assert.equal(byId(d.state.roommateInvites, "rm2").status, "PENDING");
  d.state.roommateProfiles.mai.habits = '<img src=x onerror="alert(1)">';
  d.action("roommate-profile", "mai"); assert.match(d.node("#dialog-body").innerHTML, /&lt;img/);
  d.action("edit-roommate-profile"); assert.match(d.node("#dialog-body").innerHTML, /data-form="roommate-profile"/);
  const old = structuredClone(d.state); delete old.roommateProfiles;
  const restored = demo(old); restored.state.role = "tenant"; restored.action("roommate-profile", "bao");
  assert.match(restored.node("#dialog-body").innerHTML, /Lê Gia Bảo/); assert.match(restored.node("#dialog-body").innerHTML, /Cầu Giấy/);
});

test("chat viewing cards belong to the exact conversation and participant pair", () => {
  const d = demo(); d.state.role = "tenant"; d.action("navigate", "chats"); d.action("select-chat", "c1");
  const before = JSON.stringify({ viewings: d.state.viewings, messages: d.state.conversations });
  assert.match(viewingCard(d, "v1"), /Lịch xem P101/); assert.match(viewingCard(d, "v1"), /17:00–18:00/);
  assert.match(viewingCard(d, "v1"), /UTC\+7/); assert.match(viewingCard(d, "v2"), /Đã đến xem/);
  assert.equal(viewingCard(d, "v4"), "");
  d.api.render(); assert.equal(JSON.stringify({ viewings: d.state.viewings, messages: d.state.conversations }), before);
  d.state.viewings.push({ ...byId(d.state.viewings, "v1"), id: "wrong-peer", tenantId: "bao" });
  d.api.render(); assert.equal(viewingCard(d, "wrong-peer"), "");
  d.action("select-chat", "c2"); assert.match(viewingCard(d, "v4"), /Lịch xem B12/); assert.equal(viewingCard(d, "v1"), "");
  d.action("accept-roommate", "rm1");
  d.state.viewings.push({ ...byId(d.state.viewings, "v1"), id: "wrong-type", ownerId: "bao", conversationId: d.state.selectedConversation });
  d.api.render(); assert.equal(viewingCard(d, "wrong-type"), "");
});

test("scheduling from chat keeps the conversation open, preserves drafts and restores a single live card", () => {
  const d = demo(); d.action("navigate", "chats"); d.action("select-chat", "c1");
  d.state.chatDrafts["quan:c1"] = "Mình gặp ở cổng nhé.";
  d.submit("appointment", { conversationId: "c1", roomId: "r1", date: "2026-10-24", time: "23:30", duration: "120", notes: '<b>Gặp tại cổng</b>\nMang theo giấy tờ' });
  const v = d.state.viewings.at(-1);
  assert.equal(d.state.view, "chats"); assert.equal(d.state.selectedConversation, "c1"); assert.equal(d.state.chatMobileOpen, true);
  assert.equal(d.state.chatDrafts["quan:c1"], "Mình gặp ở cổng nhé.");
  assert.match(viewingCard(d, v.id), /23:30–01:30/); assert.match(viewingCard(d, v.id), /&lt;b&gt;Gặp tại cổng&lt;\/b&gt;/);
  assert.match(viewingCard(d, v.id), /25\/10\/2026/);
  const restored = demo(d.state); restored.action("navigate", "chats"); restored.action("select-chat", "c1");
  assert.equal(restored.node("#app-main").innerHTML.split('data-viewing-id="' + v.id + '"').length - 1, 1);
  assert.match(viewingCard(restored, v.id), /Đã hẹn/);
});

test("viewing updates from chat and calendar share one record with role-specific actions", () => {
  const d = demo(); d.action("navigate", "chats"); d.action("select-chat", "c1");
  const count = d.state.viewings.length;
  assert.match(viewingCard(d, "v1"), /confirm-attendance/);
  d.state.role = "tenant"; d.api.render();
  assert.doesNotMatch(viewingCard(d, "v1"), /confirm-attendance|no-show/);
  assert.match(viewingCard(d, "v1"), /cancel-viewing/);
  d.submit("cancel-viewing", { viewingId: "v1", reason: '<script>Đổi lịch</script>' });
  assert.match(viewingCard(d, "v1"), /Đã hủy/); assert.match(viewingCard(d, "v1"), /&lt;script&gt;Đổi lịch&lt;\/script&gt;/);
  assert.doesNotMatch(viewingCard(d, "v1"), /cancel-viewing/); assert.equal(d.state.viewings.length, count);
  d.action("agree-rent", "v2"); assert.match(viewingCard(d, "v2"), /Đồng ý thuê/);
  d.action("navigate", "viewings"); assert.match(d.node("#app-main").innerHTML, /Đã hủy|Đồng ý thuê/);
  d.state.role = "landlord"; d.action("navigate", "chats"); d.action("select-chat", "c1");
  assert.match(viewingCard(d, "v2"), /open-contract/);
});

test("scheduling outside chat still opens the calendar", () => {
  const d = demo(); d.state.view = "dashboard";
  d.submit("appointment", { conversationId: "c1", roomId: "r1", date: "2026-10-24", time: "10:30", duration: "30" });
  assert.equal(d.state.view, "viewings"); assert.equal(d.state.viewings.at(-1).status, "SCHEDULED");
});

test("chat names show relationship tags for landlords, tenants and roommate connections", () => {
  const d = demo(); d.state.role = "tenant"; d.action("navigate", "chats");
  assert.match(d.node("#app-main").innerHTML, /chat-person-name[\s\S]*Nguyễn Minh Quân[\s\S]*Chủ trọ/);
  d.action("accept-roommate", "rm2");
  assert.match(d.node("#app-main").innerHTML, /<h2>Phạm Thu Mai<\/h2><span class="pill green">Bạn ghép/);
  d.state.role = "landlord"; d.action("navigate", "chats"); d.action("select-chat", "c1");
  assert.match(d.node("#app-main").innerHTML, /<h2>Trần Ngọc Lan<\/h2><span class="pill gray">Người thuê/);
});

test("sharing a post opens the connected chat, preserves drafts and creates no rental activity", () => {
  const d = demo(); d.state.role = "tenant"; d.action("accept-roommate", "rm1");
  const c = byId(d.state.conversations, d.state.selectedConversation);
  d.state.chatDrafts["lan:" + c.id] = "Mình đang so sánh hai phòng";
  const before = JSON.stringify({ contracts: d.state.contracts, joins: d.state.joinRequests, viewings: d.state.viewings });
  d.action("share-post", ""); assert.match(d.node("#dialog-body").innerHTML, /data-form="share-post"/);
  d.submit("share-post", { inviteId: "rm1", postId: "p-r2", note: '<b>Thử xem phòng này</b>' });
  assert.equal(c.messages.at(-1).messageType, "POST_SHARE"); assert.equal(c.messages.at(-1).sharedPostId, "p-r2");
  assert.equal(c.messages.at(-1).roomId, null); assert.equal(d.state.chatContext, null);
  assert.equal(d.state.chatDrafts["lan:" + c.id], "Mình đang so sánh hai phòng");
  assert.equal(JSON.stringify({ contracts: d.state.contracts, joins: d.state.joinRequests, viewings: d.state.viewings }), before);
  assert.match(d.node("#app-main").innerHTML, /shared-post-card/); assert.match(d.node("#app-main").innerHTML, /&lt;b&gt;Thử xem phòng này/);
  const restored = demo(d.state); restored.state.role = "tenant"; restored.action("chat-roommate", "rm1");
  assert.equal(byId(restored.state.conversations, c.id).messages.length, 1);
  assert.match(restored.node("#app-main").innerHTML, /Phòng ban công thoáng/);
});

test("sharing rechecks connection and publication before changing any conversation", () => {
  for (const kind of ["pending", "ended", "foreign", "unpublished", "missing", "landlord"]) {
    const d = demo(); d.state.role = "tenant"; d.action("accept-roommate", "rm1");
    const invite = byId(d.state.roommateInvites, "rm1");
    if (kind === "pending") invite.status = "PENDING";
    if (kind === "ended") invite.endedAt = "2026-10-25T01:00:00Z";
    if (kind === "foreign") { invite.senderId = "mai"; invite.receiverId = "ngoc"; }
    if (kind === "unpublished") byId(d.state.posts, "p-r2").status = "REJECTED";
    if (kind === "landlord") d.state.role = "landlord";
    const before = JSON.stringify(d.state.conversations);
    d.submit("share-post", { inviteId: "rm1", postId: kind === "missing" ? "gone" : "p-r2" });
    assert.equal(JSON.stringify(d.state.conversations), before, kind);
  }
});

test("shared posts hide unavailable listings and keep live availability without losing the message", () => {
  const d = demo(); d.state.role = "tenant"; d.action("accept-roommate", "rm1");
  d.submit("share-post", { inviteId: "rm1", postId: "p-r2" });
  const c = byId(d.state.conversations, d.state.selectedConversation); const id = c.messages[0].id;
  byId(d.state.posts, "p-r2").status = "REJECTED"; d.api.render();
  assert.match(d.node("#app-main").innerHTML, /Tin phòng không còn hiển thị/);
  assert.doesNotMatch(d.node("#app-main").innerHTML, /Phòng ban công thoáng|shared-post-detail/);
  d.action("shared-post-detail", id); assert.equal(d.state.view, "chats");
  byId(d.state.posts, "p-r2").status = "APPROVED"; byId(d.state.rooms, "r2").status = "MAINTENANCE"; d.api.render();
  assert.match(d.node("#app-main").innerHTML, /Đang bảo trì/); assert.equal(c.messages.length, 1);
});

test("a shared post opens its detail and returns to the same roommate conversation", () => {
  const d = demo(); d.state.role = "tenant"; d.action("accept-roommate", "rm1");
  const id = d.state.selectedConversation; const count = d.state.conversations.length;
  d.submit("share-post", { inviteId: "rm1", postId: "p-r4" });
  d.action("shared-post-detail", byId(d.state.conversations, id).messages[0].id);
  assert.equal(d.state.view, "detail"); assert.equal(d.state.selectedRoom, "r4");
  assert.match(d.node("#app-main").innerHTML, /Quay lại tin nhắn/);
  d.action("return-shared-chat", id); assert.equal(d.state.view, "chats"); assert.equal(d.state.selectedConversation, id);
  assert.equal(d.state.conversations.length, count);
});

test("sharing from a room detail can select a different accepted roommate", () => {
  const d = demo(); d.state.role = "tenant"; d.action("accept-roommate", "rm1"); d.action("accept-roommate", "rm2");
  const maiChat = d.state.selectedConversation;
  d.action("room-detail", "r1"); d.action("share-post", "p-r1");
  assert.match(d.node("#dialog-body").innerHTML, /Lê Gia Bảo/); assert.match(d.node("#dialog-body").innerHTML, /Phạm Thu Mai/);
  assert.doesNotMatch(d.node("#dialog-body").innerHTML, /value="r6"/);
  d.submit("share-post", { inviteId: "rm1", postId: "p-r1" });
  assert.equal(byId(d.state.conversations, maiChat).messages.length, 0);
  assert.equal(byId(d.state.conversations, d.state.selectedConversation).roommateRequestId, "rm1");
});

const listingValues = (extra = {}) => ({ listingMode: "CREATE", roomId: "r1", title: "Tin mới cho phòng", description: "Nội dung độc lập", photo: "assets/r1.webp", ...extra });
const editValues = (p, extra = {}) => listingValues({ listingMode: "EDIT", postId: p.id, roomId: p.roomId, originalPostStatus: p.status, originalVersion: String(p.version), title: p.title, description: p.description, photo: p.photo, ...extra });

test("all existing rooms remain selectable even when they already have approved or pending posts", () => {
  const d = demo(); d.action("open-listing", ""); const html = d.node("#dialog-body").innerHTML;
  assert.match(html, /data-form="listing"/); assert.match(html, /option value="r1"/); assert.match(html, /option value="r6"/);
  assert.doesNotMatch(html, /option value="r4"/); assert.match(html, /0\/3 bài chờ duyệt/); assert.match(html, /Tổng số bài đăng của phòng không giới hạn/);
});

test("a landlord with no rooms gets an accurate empty state", () => {
  const d = demo(); d.state.rooms = d.state.rooms.filter((r) => r.houseId !== "h1"); d.action("open-listing", "");
  assert.match(d.node("#dialog-body").innerHTML, /Bạn chưa có phòng/);
  assert.doesNotMatch(d.node("#dialog-body").innerHTML, /data-form="listing"/);
});

test("one room accepts three pending posts and rejects further submissions without overwriting other data", () => {
  const d = demo(), before = JSON.stringify(d.state.rooms), original = JSON.stringify(byId(d.state.posts,"p-r1")), count = d.state.posts.length;
  for (let n=0;n<5;n++) d.submit("listing",listingValues({ title: `Bài độc lập ${n}` }));
  assert.equal(d.state.posts.length,count+3); assert.equal(new Set(d.state.posts.map((p) => p.id)).size,count+3);
  assert.equal(d.state.posts.filter((p) => p.roomId === "r1" && p.status === "PENDING_REVIEW").length,3);
  assert.equal(JSON.stringify(byId(d.state.posts,"p-r1")),original); assert.equal(JSON.stringify(d.state.rooms),before);
});

test("editing a post keeps its room fixed and changes only that post", () => {
  const d=demo(), p=byId(d.state.posts,"p-r1"); d.submit("listing",listingValues()); const sibling=JSON.stringify(d.state.posts.at(-1));
  d.action("edit-listing",p.id); assert.match(d.node("#dialog-body").innerHTML,/name="postId" value="p-r1"/);
  d.submit("listing",editValues(p,{title:"Nội dung cập nhật"}));
  assert.equal(p.title,"Nội dung cập nhật"); assert.equal(p.status,"PENDING_REVIEW"); assert.equal(p.version,2);
  assert.equal(JSON.stringify(d.state.posts.at(-1)),sibling); assert.equal(byId(d.state.rooms,"r1").title,"Studio sáng, đầy đủ nội thất");
});

test("listing submit rejects foreign rooms, changed targets and stale status or content version", () => {
  for (const kind of ["foreign","room-change","missing","status","version"]) {
    const d=demo(), p=byId(d.state.posts,"p-r1"), values=editValues(p,{title:"Must not overwrite"});
    if(kind==="foreign") values.roomId="r4";
    if(kind==="room-change") values.roomId="r2";
    if(kind==="missing") values.postId="gone";
    if(kind==="status") values.originalPostStatus="DRAFT";
    if(kind==="version") values.originalVersion="0";
    const before=JSON.stringify({posts:d.state.posts,rooms:d.state.rooms}); d.submit("listing",values);
    assert.equal(JSON.stringify({posts:d.state.posts,rooms:d.state.rooms}),before);
  }
});

test("post images accept bundled and HTTP URLs, rejecting invalid sources before changing the post", () => {
  const d=demo(), p=byId(d.state.posts,"p-r1");
  for(const photo of ["javascript:alert(1)","data:text/html,test","file:///secret","assets/missing.webp"]) {
    const before=JSON.stringify(p); d.submit("listing",editValues(p,{photo})); assert.equal(JSON.stringify(p),before);
  }
  d.submit("listing",editValues(p,{photo:"https://example.com/room.jpg"})); assert.equal(p.photo,"https://example.com/room.jpg");
});

test("approval, rejection and hiding target one post and enforce owner or administrator permissions", () => {
  const d=demo(); d.submit("listing",listingValues()); const first=d.state.posts.at(-1);
  d.submit("listing",listingValues({title:"Bài thứ hai"})); const second=d.state.posts.at(-1);
  d.action("approve-listing",first.id); assert.equal(first.status,"PENDING_REVIEW");
  d.state.role="admin"; d.action("approve-listing",first.id); assert.equal(first.status,"APPROVED"); assert.equal(second.status,"PENDING_REVIEW");
  d.submit("moderation-reason",{kind:"reject-listing",targetId:second.id,reason:""}); assert.equal(second.status,"PENDING_REVIEW");
  d.submit("moderation-reason",{kind:"reject-listing",targetId:second.id,reason:"Cần sửa ảnh"}); assert.equal(second.status,"REJECTED");
  d.state.role="tenant"; d.submit("moderation-reason",{kind:"hide-listing",targetId:first.id,reason:"Hide"}); assert.equal(first.status,"APPROVED");
  d.state.role="landlord"; d.submit("moderation-reason",{kind:"hide-listing",targetId:first.id,reason:"Chủ trọ tạm ẩn"}); assert.equal(first.status,"HIDDEN");
  assert.equal(byId(d.state.posts,"p-r1").status,"APPROVED");
});

test("discovery, favorites and detail distinguish two approved posts for the same room", () => {
  const d=demo(); d.submit("listing",listingValues({title:"Bài thứ hai cùng phòng"})); const second=d.state.posts.at(-1);
  d.state.role="admin"; d.action("approve-listing",second.id); d.state.role="tenant"; d.state.view="discover"; d.api.render();
  assert.match(d.node("#app-main").innerHTML,/Bài thứ hai cùng phòng/);
  d.action("favorite",second.id); d.action("favorite","p-r1");
  assert.ok(d.state.favorites.includes(second.id)); assert.ok(d.state.favorites.includes("p-r1"));
  d.action("post-detail",second.id); assert.equal(d.state.selectedPost,second.id); assert.equal(d.state.selectedRoom,"r1");
  second.status="HIDDEN"; d.api.render(); assert.doesNotMatch(d.node("#app-main").innerHTML,/Bài thứ hai cùng phòng/);
  d.action("post-detail","p-r1"); assert.match(d.node("#app-main").innerHTML,/Studio sáng/);
});

test("sharing and reporting use exact post IDs rather than the shared room ID", () => {
  const d=demo(); d.submit("listing",listingValues({title:"Tin phòng riêng"})); const second=d.state.posts.at(-1);
  second.status="APPROVED"; d.state.role="tenant"; d.action("accept-roommate","rm1");
  d.submit("share-post",{inviteId:"rm1",postId:second.id}); const c=byId(d.state.conversations,d.state.selectedConversation);
  const message=c.messages.at(-1); assert.equal(message.sharedPostId,second.id);
  d.action("shared-post-detail",message.id); assert.equal(d.state.selectedPost,second.id);
  d.action("report-post",second.id); assert.match(d.node("#dialog-body").innerHTML,new RegExp(`name="postId" value="${second.id}"`));
  d.submit("report-post",{postId:second.id,reason:"Kiểm tra tin"}); assert.equal(d.state.reports.at(-1).postId,second.id);
  second.status="HIDDEN"; d.action("chat-roommate","rm1"); assert.match(d.node("#app-main").innerHTML,/shared-post-unavailable/);
  assert.equal(byId(d.state.posts,"p-r1").status,"APPROVED");
});

test("a proposal from a second post keeps its provenance and cannot be approved through a hidden sibling", () => {
  const d=demo(); d.submit("listing",listingValues({title:"Tin khác cùng P101"})); const second=d.state.posts.at(-1); second.status="APPROVED";
  d.state.role="tenant"; d.action("request-post-viewing",second.id);
  d.submit("viewing-request",{conversationId:d.state.selectedConversation,roomId:"r1",postId:second.id,date:"2026-10-24",time:"12:00",duration:"60",clientRequestKey:"00000000-0000-4000-8000-000000000099"});
  const p=d.state.viewingProposals.at(-1); assert.equal(p.postId,second.id);
  second.status="HIDDEN"; d.state.role="landlord"; const count=d.state.viewings.length; d.action("accept-viewing-proposal",p.id);
  assert.equal(p.status,"PENDING"); assert.equal(d.state.viewings.length,count);
  second.status="APPROVED"; d.action("accept-viewing-proposal",p.id); assert.equal(p.status,"ACCEPTED");
  assert.equal(d.state.viewings.at(-1).postId,second.id);
});

test("old saved room-based posts, favorites and shared messages migrate once without losing rental data", () => {
  const d=demo(), old=structuredClone(d.state), contractSnapshot=JSON.stringify(old.contracts);
  for(const r of old.rooms) { const p=old.posts.find((x)=>x.roomId===r.id); if(p) Object.assign(r,{title:p.title,description:p.description,photo:p.photo,postStatus:p.status}); }
  delete old.posts; old.favorites=["r2"]; old.conversations.push({id:"legacy-shared",type:"ROOMMATE",users:["lan","bao"],messages:[{messageType:"POST_SHARE",sharedPostId:"r2",text:"Old share"}]});
  const reloaded=demo(old); assert.equal(reloaded.state.posts.length,6); assert.equal(reloaded.state.favorites[0],"p-r2");
  assert.equal(byId(reloaded.state.conversations,"legacy-shared").messages[0].sharedPostId,"p-r2");
  assert.equal(JSON.stringify(reloaded.state.contracts),contractSnapshot); assert.equal(demo(reloaded.state).state.posts.length,6);
});

test("a pending post can be edited at the limit, while resubmitting an approved post preserves its old data", () => {
  const d=demo(); for(let n=0;n<3;n++) d.submit("listing",listingValues({title:`Pending ${n}`}));
  const p=d.state.posts.at(-1), total=d.state.posts.length;
  d.submit("listing",editValues(p,{title:"Edited while full"}));
  assert.equal(p.title,"Edited while full"); assert.equal(p.version,2); assert.equal(d.state.posts.length,total);
  const approved=byId(d.state.posts,"p-r1"), before=JSON.stringify(approved);
  d.submit("listing",editValues(approved,{title:"Must remain approved"}));
  assert.equal(JSON.stringify(approved),before);
  d.action("edit-listing",approved.id); assert.match(d.node("#dialog-body").innerHTML,/type="submit" disabled/);
});

test("the pending limit is per room, and approval or rejection frees a place without limiting total posts", () => {
  const d=demo(); for(const roomId of ["r1","r2"]) for(let n=0;n<3;n++) d.submit("listing",listingValues({roomId,title:`${roomId} ${n}`}));
  assert.equal(d.state.posts.filter((p)=>p.status==="PENDING_REVIEW" && p.roomId==="r1").length,3);
  assert.equal(d.state.posts.filter((p)=>p.status==="PENDING_REVIEW" && p.roomId==="r2").length,3);
  const first=d.state.posts.find((p)=>p.status==="PENDING_REVIEW"&&p.roomId==="r1");
  d.state.role="admin"; d.action("approve-listing",first.id); d.state.role="landlord"; d.submit("listing",listingValues({title:"Place reopened"}));
  assert.equal(d.state.posts.at(-1).title,"Place reopened");
  for(let n=0;n<5;n++) {
    const candidate=d.state.posts.find((p)=>p.status==="PENDING_REVIEW"&&p.roomId==="r1");
    d.state.role="admin"; d.submit("moderation-reason",{kind:"reject-listing",targetId:candidate.id,reason:"Revise"});
    d.state.role="landlord"; d.submit("listing",listingValues({title:`No total cap ${n}`}));
  }
  assert.ok(d.state.posts.filter((p)=>p.roomId==="r1").length>6);
  assert.equal(d.state.posts.filter((p)=>p.status==="PENDING_REVIEW"&&p.roomId==="r1").length,3);
});

test("a stale create form rechecks pending capacity at submit without changing any post", () => {
  const d=demo(); for(let n=0;n<2;n++) d.submit("listing",listingValues({title:`Pending ${n}`}));
  d.action("open-listing",""); assert.match(d.node("#dialog-body").innerHTML,/2\/3 bài chờ duyệt/);
  d.submit("listing",listingValues({title:"Third from another form"})); const before=JSON.stringify(d.state.posts);
  d.submit("listing",listingValues({title:"Stale fourth"})); assert.equal(JSON.stringify(d.state.posts),before);
});

test("room details show physical data and only posts for that room, with a round trip to post detail", () => {
  const d=demo(); d.submit("listing",listingValues({title:"Related pending"}));
  d.action("navigate","properties"); assert.match(d.node("#app-main").innerHTML,/data-action="room-detail" data-id="r1"/);
  d.action("room-detail","r1"); const html=d.node("#app-main").innerHTML;
  assert.equal(d.state.view,"room-detail"); assert.equal(d.state.selectedPost,null);
  assert.match(html,/Thông tin phòng/); assert.match(html,/Related pending/); assert.match(html,/data-related-post-id="p-r1"/);
  assert.doesNotMatch(html,/data-related-post-id="p-r2"/); assert.match(html,/1\/3 bài chờ duyệt/);
  d.action("room-post-detail","p-r1"); assert.equal(d.state.selectedPost,"p-r1"); assert.match(d.node("#app-main").innerHTML,/Quay lại chi tiết phòng/);
  d.action("room-detail","r1"); assert.equal(d.state.view,"room-detail");
});

test("creating a post from room detail preselects that room and returns to its related list", () => {
  const d=demo(); d.action("room-detail","r2"); d.action("create-room-post","r2");
  assert.match(d.node("#dialog-body").innerHTML,/option value="r2" selected/);
  d.submit("listing",listingValues({roomId:"r2",title:"From room detail"}));
  assert.equal(d.state.posts.at(-1).roomId,"r2"); assert.equal(d.state.view,"room-detail"); assert.equal(d.state.selectedRoom,"r2");
  assert.match(d.node("#app-main").innerHTML,/From room detail/);
});

test("tenant room detail hides pending, rejected and hidden posts while the owner can manage them", () => {
  const d=demo(); for(const status of ["PENDING_REVIEW","REJECTED","HIDDEN"]) d.state.posts.push({id:`private-${status}`,roomId:"r1",title:`Private ${status}`,status,version:1,description:"Private content",photo:"assets/r1.webp"});
  d.state.role="tenant"; d.action("room-detail","r1"); const html=d.node("#app-main").innerHTML;
  assert.match(html,/data-related-post-id="p-r1"/); assert.doesNotMatch(html,/Private|private-|data-room-quota|create-room-post|edit-listing/);
  d.state.role="landlord"; d.api.render(); assert.match(d.node("#app-main").innerHTML,/Private PENDING_REVIEW/);
  d.state.role="admin"; d.api.render(); assert.match(d.node("#app-main").innerHTML,/Private HIDDEN/);
});

test("room details enforce access and show an empty related list for a new private room", () => {
  const d=demo(); d.state.rooms.push({...byId(d.state.rooms,"r1"),id:"empty-room",code:"EMPTY"});
  d.action("room-detail","empty-room"); assert.match(d.node("#app-main").innerHTML,/Chưa có bài đăng liên quan/);
  d.state.role="tenant"; d.api.render(); assert.match(d.node("#app-main").innerHTML,/Không thể xem phòng/);
  d.action("room-detail","r6"); assert.equal(d.state.selectedRoom,"empty-room");
  d.state.role="landlord"; byId(d.state.posts,"p-r4").status="HIDDEN"; d.action("room-detail","r4"); assert.equal(d.state.selectedRoom,"empty-room");
});


const proposalValues = (extra = {}) => ({ conversationId: "c1", roomId: "r1", date: "2026-10-24", time: "10:30", duration: "60", notes: "Gặp tại cổng", clientRequestKey: "00000000-0000-4000-8000-000000000001", ...extra });
function requestViewing(d, extra) { d.state.role = "tenant"; d.submit("viewing-request", proposalValues(extra)); return d.state.viewingProposals.at(-1); }

test("a tenant can propose from a listing without prior messages, without scheduling or reserving the room", () => {
  const d = demo(); d.state.role = "tenant"; d.state.conversations = [];
  const before = JSON.stringify({ rooms: d.state.rooms, contracts: d.state.contracts, viewings: d.state.viewings });
  d.action("open-viewing-request", "r1");
  assert.match(d.node("#dialog-body").innerHTML, /data-form="viewing-request"/);
  const c = d.state.conversations.at(-1); assert.equal(c.messages.length, 0);
  const p = requestViewing(d, { conversationId: c.id });
  assert.equal(p.status, "PENDING"); assert.equal(p.startsAt, "2026-10-24T03:30:00.000Z");
  assert.equal(JSON.stringify({ rooms: d.state.rooms, contracts: d.state.contracts, viewings: d.state.viewings }), before);
  assert.equal(d.state.selectedConversation, c.id); assert.equal(d.state.view, "chats");
  assert.match(d.node("#app-main").innerHTML, /Rút đề nghị/);
});

test("proposal retries are idempotent and one pending proposal per tenant and room is enforced", () => {
  const d = demo(); requestViewing(d); const notifications = d.state.notifications.length;
  d.submit("viewing-request", proposalValues());
  d.submit("viewing-request", proposalValues({ notes: "Changed payload" }));
  d.submit("viewing-request", proposalValues({ clientRequestKey: "00000000-0000-4000-8000-000000000002", time: "12:00" }));
  assert.equal(d.state.viewingProposals.length, 1); assert.equal(d.state.notifications.length, notifications);
  assert.equal(d.state.viewingProposals[0].notes, "Gặp tại cổng");
});

test("only the landlord approves a proposal and approval creates one linked, reusable official schedule", () => {
  const d = demo(); const p = requestViewing(d); const count = d.state.viewings.length;
  d.action("accept-viewing-proposal", p.id); assert.equal(p.status, "PENDING");
  d.state.role = "landlord"; d.action("accept-viewing-proposal", p.id);
  assert.equal(p.status, "ACCEPTED"); assert.equal(d.state.viewings.length, count + 1);
  const v = byId(d.state.viewings, p.scheduledViewingId);
  assert.equal(v.createdBy, "quan"); assert.equal(v.sourceProposalId, p.id); assert.equal(v.tenantId, "lan");
  v.status = "CANCELLED";
  d.action("accept-viewing-proposal", p.id); assert.equal(d.state.viewings.length, count + 1);
  assert.equal(v.status, "CANCELLED");
  const reloaded = demo(d.state); assert.equal(reloaded.state.viewingProposals[0].scheduledViewingId, v.id);
});

test("pending proposals do not hold time slots and approval rechecks overlapping official viewings", () => {
  const d = demo(); const p = requestViewing(d); const count = d.state.viewings.length;
  d.state.role = "landlord";
  d.submit("appointment", proposalValues()); assert.equal(d.state.viewings.length, count + 1);
  d.action("accept-viewing-proposal", p.id);
  assert.equal(p.status, "PENDING"); assert.equal(d.state.viewings.length, count + 1);
  d.state.viewings.at(-1).status = "CANCELLED";
  d.action("accept-viewing-proposal", p.id); assert.equal(p.status, "ACCEPTED");
});

test("approval rechecks publication, room occupancy, participants and account status atomically", () => {
  const changes = [
    (d) => { byId(d.state.posts, "p-r1").status = "HIDDEN"; },
    (d) => { byId(d.state.rooms, "r1").status = "MAINTENANCE"; },
    (d) => { byId(d.state.conversations, "c1").users = ["quan", "bao"]; },
    (d) => { d.state.lockedUsers = ["lan"]; },
    (d) => { byId(d.state.viewingProposals, d.state.viewingProposals[0].id).ownerId = "other-owner"; }
  ];
  for (const mutate of changes) {
    const d = demo(); const p = requestViewing(d); const before = d.state.viewings.length;
    mutate(d); d.state.role = "landlord"; d.action("accept-viewing-proposal", p.id);
    assert.equal(p.status, "PENDING"); assert.equal(d.state.viewings.length, before);
  }
});

test("rejection requires the owner and a reason; rejected proposals remain visible and immutable", () => {
  const d = demo(); const p = requestViewing(d);
  d.submit("reject-viewing-proposal", { proposalId: p.id, reason: "Busy" }); assert.equal(p.status, "PENDING");
  d.state.role = "landlord";
  d.submit("reject-viewing-proposal", { proposalId: p.id, reason: " " }); assert.equal(p.status, "PENDING");
  d.submit("reject-viewing-proposal", { proposalId: p.id, reason: "Chủ trọ bận, vui lòng chọn giờ khác" });
  assert.equal(p.status, "REJECTED"); assert.equal(p.reviewedBy, "quan");
  d.action("accept-viewing-proposal", p.id); assert.equal(p.status, "REJECTED");
  d.state.role = "tenant"; d.state.view = "viewings"; d.api.render();
  assert.match(d.node("#app-main").innerHTML, /Chủ trọ bận/);
});

test("withdrawal belongs to the requester, releases the pending constraint and survives reload", () => {
  const d = demo(); const p = requestViewing(d);
  d.state.role = "landlord"; d.action("withdraw-viewing-proposal", p.id); assert.equal(p.status, "PENDING");
  d.state.role = "tenant"; d.action("withdraw-viewing-proposal", p.id);
  assert.equal(p.status, "WITHDRAWN"); assert.equal(p.withdrawnBy, "lan");
  d.submit("viewing-request", proposalValues({ clientRequestKey: "00000000-0000-4000-8000-000000000002", time: "12:00" }));
  assert.equal(d.state.viewingProposals.length, 2);
  assert.equal(demo(d.state).state.viewingProposals[0].status, "WITHDRAWN");
});

test("expired proposals cannot be accepted or withdrawn, even before the next render", () => {
  const d = demo(); const p = requestViewing(d); const count = d.state.viewings.length;
  d.now("2026-10-24T03:30:00Z"); d.state.role = "landlord"; d.action("accept-viewing-proposal", p.id);
  assert.equal(p.status, "EXPIRED"); assert.ok(p.expiredAt); assert.equal(d.state.viewings.length, count);
  d.state.role = "tenant"; d.action("withdraw-viewing-proposal", p.id); assert.equal(p.status, "EXPIRED");
});

test("owner scheduling needs a real tenant message about the selected room and cannot use a roommate chat", () => {
  const d = demo(); const c = byId(d.state.conversations, "c1"); const count = d.state.viewings.length;
  c.messages = [{ senderId: "quan", roomId: "r1", text: "Owner only" }];
  d.submit("appointment", proposalValues()); assert.equal(d.state.viewings.length, count);
  c.messages.push({ senderId: "lan", roomId: "r2", text: "Other room" });
  d.submit("appointment", proposalValues()); assert.equal(d.state.viewings.length, count);
  c.messages.push({ senderId: "lan", roomId: "r1", text: "Hẹn xem phòng này nhé" });
  d.submit("appointment", proposalValues()); assert.equal(d.state.viewings.length, count + 1);
  c.type = "ROOMMATE";
  d.submit("appointment", proposalValues({ time: "13:00" })); assert.equal(d.state.viewings.length, count + 1);
});

test("proposals never leak into roommate chats or permit rental contracts before viewing", () => {
  const d = demo(); const p = requestViewing(d); const contracts = d.state.contracts.length;
  d.state.role = "landlord"; d.action("open-contract", p.id);
  assert.equal(d.node("#app-dialog").open, false); assert.equal(d.state.contracts.length, contracts);
  d.state.role = "tenant"; d.action("accept-roommate", "rm1"); d.api.render();
  assert.doesNotMatch(d.node("#app-main").innerHTML, new RegExp(`data-proposal-id="${p.id}"`));
  assert.doesNotMatch(d.node("#app-main").innerHTML, /data-action="open-viewing-request"/);
});

const rentalValues = (extra = {}) => ({ viewingId: "v2", start: "2026-10-24", end: "2027-10-24", rent: "4600000", deposit: "4600000", members: "", terms: "Điều khoản đã trao đổi", ...extra });
function reservationDemo() {
  const d = demo();
  d.state.viewings.push(
    { id: "upcoming", roomId: "r2", tenantId: "bao", ownerId: "quan", conversationId: "c-extra", date: "2026-10-25", time: "11:00", status: "SCHEDULED", decision: "WAITING" },
    { id: "elapsed", roomId: "r2", tenantId: "mai", ownerId: "quan", date: "2026-10-23", time: "11:00", status: "SCHEDULED", decision: "WAITING" },
    { id: "ongoing", roomId: "r2", tenantId: "ngoc", ownerId: "quan", date: "2026-10-24", time: "09:30", status: "SCHEDULED", decision: "WAITING" }
  );
  d.state.viewingProposals.push(
    { id: "accepted", roomId: "r2", tenantId: "bao", ownerId: "quan", conversationId: "c-extra", status: "ACCEPTED", scheduledViewingId: "upcoming", date: "2026-10-25", time: "11:00" },
    { id: "pending", roomId: "r2", tenantId: "ngoc", ownerId: "quan", conversationId: "c-extra", status: "PENDING", date: "2026-10-25", time: "13:00" },
    { id: "expired-pending", roomId: "r2", tenantId: "mai", ownerId: "quan", status: "PENDING", date: "2026-10-23", time: "13:00" },
    { id: "other-room", roomId: "r1", tenantId: "lan", ownerId: "quan", conversationId: "c1", status: "PENDING", date: "2026-10-25", time: "12:00" }
  );
  return d;
}

test("agreeing to rent registers interest without cancelling other viewings or holding the room", () => {
  const d = reservationDemo(); d.state.role = "tenant"; d.action("agree-rent", "v2");
  assert.equal(byId(d.state.viewings, "v2").decision, "AGREED");
  assert.equal(byId(d.state.rooms, "r2").status, "AVAILABLE");
  assert.equal(byId(d.state.viewings, "upcoming").status, "SCHEDULED");
  assert.equal(byId(d.state.viewingProposals, "pending").status, "PENDING");
});

test("the contract form explains exactly which future appointments and pending requests will close", () => {
  const d = reservationDemo(); byId(d.state.viewings, "v2").decision = "AGREED";
  d.action("open-contract", "v2");
  assert.match(d.node("#dialog-body").innerHTML, /hủy 1 lịch xem sắp tới và đóng 1 đề nghị chờ/);
  assert.equal(byId(d.state.viewings, "upcoming").status, "SCHEDULED");
});

test("sending a contract closes only upcoming activity and notifies affected tenants and the owner", () => {
  const d = reservationDemo(); byId(d.state.viewings, "v2").decision = "AGREED";
  d.submit("create-contract", rentalValues());
  const v = byId(d.state.viewings, "upcoming"), p = byId(d.state.viewingProposals, "pending");
  assert.equal(v.status, "CANCELLED"); assert.equal(v.cancelledBy, "quan"); assert.ok(v.cancelledAt); assert.match(v.cancellationReason, /Phòng đã được giữ/);
  assert.equal(p.status, "REJECTED"); assert.equal(p.reviewedBy, "quan"); assert.ok(p.reviewedAt); assert.match(p.rejectionReason, /Phòng đã được giữ/);
  assert.equal(byId(d.state.viewingProposals, "accepted").status, "ACCEPTED");
  assert.equal(byId(d.state.viewingProposals, "accepted").scheduledViewingId, v.id);
  assert.equal(byId(d.state.viewingProposals, "expired-pending").status, "EXPIRED");
  for (const id of ["elapsed", "ongoing", "v1"]) assert.equal(byId(d.state.viewings, id).status, "SCHEDULED");
  assert.equal(byId(d.state.viewings, "v2").status, "COMPLETED");
  assert.equal(byId(d.state.viewingProposals, "other-room").status, "PENDING");
  assert.equal(byId(d.state.rooms, "r2").status, "RESERVED");
  assert.ok(d.state.notifications.some((n) => n.userId === "bao" && n.viewingId === v.id));
  assert.ok(d.state.notifications.some((n) => n.userId === "ngoc" && n.proposalId === p.id));
  assert.ok(d.state.notifications.some((n) => n.userId === "quan" && /hủy 1 lịch/.test(n.text)));
});

test("failed contract validation never partially cancels appointments or closes proposals", () => {
  const d = reservationDemo(); byId(d.state.viewings, "v2").decision = "AGREED";
  const before = JSON.stringify({ contracts: d.state.contracts, viewings: d.state.viewings, proposals: d.state.viewingProposals, notifications: d.state.notifications });
  d.submit("create-contract", rentalValues({ members: "A\nB\nC\nD" }));
  assert.equal(JSON.stringify({ contracts: d.state.contracts, viewings: d.state.viewings, proposals: d.state.viewingProposals, notifications: d.state.notifications }), before);
});

test("duplicate submissions and stale contract forms cannot duplicate cleanup or notifications", () => {
  const d = reservationDemo(); byId(d.state.viewings, "v2").decision = "AGREED";
  d.submit("create-contract", rentalValues()); const count = d.state.notifications.length, contracts = d.state.contracts.length;
  d.submit("create-contract", rentalValues());
  assert.equal(d.state.notifications.length, count); assert.equal(d.state.contracts.length, contracts);
  d.state.viewings.push({ ...byId(d.state.viewings, "v2"), id: "other-agreed", tenantId: "bao" });
  d.submit("create-contract", rentalValues({ viewingId: "other-agreed" }));
  assert.equal(d.state.notifications.length, count); assert.equal(d.state.contracts.length, contracts);
});

test("confirmation keeps the hold and cancelling the contract never restores previously cancelled viewings", () => {
  const d = reservationDemo(); byId(d.state.viewings, "v2").decision = "AGREED";
  d.submit("create-contract", rentalValues()); const id = d.state.selectedContract;
  d.state.role = "tenant"; d.action("confirm-contract", id);
  assert.equal(byId(d.state.rooms, "r2").status, "RESERVED");
  d.state.role = "landlord"; d.submit("cancel-contract", { contractId: id, reason: "Hai bên hủy" });
  assert.equal(byId(d.state.rooms, "r2").status, "AVAILABLE");
  const reloaded = demo(d.state);
  assert.equal(byId(reloaded.state.viewings, "upcoming").status, "CANCELLED");
  assert.equal(byId(reloaded.state.viewingProposals, "pending").status, "REJECTED");
});
