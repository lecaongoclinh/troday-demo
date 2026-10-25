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
  const timers = new Map(); let timerSequence = 0;
  const context = vm.createContext({
    Date: Clock, Intl, structuredClone, URLSearchParams, URL,
    setTimeout: (callback, delay) => { const id = ++timerSequence; timers.set(id, { callback, delay }); return id; }, clearTimeout: (id) => timers.delete(id),
    localStorage: { getItem: (key) => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) },
    document: { querySelector: node, querySelectorAll: () => [], addEventListener() {} },
    window: { scrollTo() {}, houseProofStore: { async save(entries, ownerId) { return entries.map(({ file, documentType }, index) => ({ id: `test-file-${index}-${now}`, ownerId, documentType, name: file.name, size: file.size, type: file.type })); }, async remove() {} } }, location: { search: "" },
    FormData: class {
      constructor(form) { this.values = form.values; }
      get(key) { const value = this.values[key]; return Array.isArray(value) ? value[0] : value ?? null; }
      getAll(key) { const value = this.values[key]; return value == null ? [] : Array.isArray(value) ? value : [value]; }
    }
  });
  vm.runInContext(fs.readFileSync(`${__dirname}/../house-rights.js`, "utf8"), context);
  vm.runInContext(fs.readFileSync(`${__dirname}/../app.js`, "utf8"), context);
  const api = vm.runInContext("({ state: () => state, handleAction, handleForm, render, renderResidents, roomLoad, appointmentTimestamp, todayISO, openAppointment, receiveSharedState, syncIncomingNotifications, effectiveHouseVerification, houseVerificationState, houseIdentity })", context);
  const state = api.state();
  state.role = "landlord"; state.view = "residents";
  return { state, api, node, action: api.handleAction, submit: (name, values) => api.handleForm({ dataset: { form: name }, values, querySelector: () => ({ disabled: false }) }), now: (value) => { now = Date.parse(value); }, expirePopups: () => { for (const timer of [...timers.values()]) if (timer.delay === 8000) timer.callback(); } };
}
const byId = (items, id) => items.find((item) => item.id === id);
const newHouseValues = (extra = {}) => ({ houseId: "", creationKey: "house-test-1", name: "New house", address: "123 New Street", provinceCode: "01", area: "New area", latitude: "", longitude: "", notes: "", ...extra });
const pdfProof = { name: "proof.pdf", size: 100, type: "application/pdf" };
function houseProofValues(d, houseId, extra = {}) { return { houseId, houseVersion: String(byId(d.state.houses,houseId).verificationVersion), rightType: "OWNER", scope: "Entire house", validFrom: "2026-10-24", validUntil: "", note: "", document_OWNER_PROOF: pdfProof, ...extra }; }
function approveHouseProof(d, id) { d.state.role="admin"; d.submit("house-verification-decision", { verificationId:id, decision:"APPROVE", checkedEvidence:"yes" }); }

test("new house creates one owned draft with no rooms, survives reload and supports empty services", () => {
  const d=demo(); const count=d.state.houses.length;
  d.submit("house",newHouseValues()); const h=d.state.houses.at(-1);
  assert.equal(h.ownerId,"quan"); assert.equal(d.api.houseVerificationState(h).status,"DRAFT");
  d.submit("house",newHouseValues()); assert.equal(d.state.houses.length,count+1);
  d.action("house-services",h.id); assert.match(d.node("#app-main").innerHTML,/Chưa có phòng/);
  d.submit("service",{serviceId:"",name:"Water",unit:"m3",price:"12000",method:"METERED"});
  assert.equal(d.state.services.at(-1).houseId,h.id);
  d.action("navigate","properties"); assert.match(d.node("#app-main").innerHTML,/Cần xác minh quyền cho thuê/);
  const restored=demo(JSON.parse(JSON.stringify(d.state)));
  assert.equal(restored.api.effectiveHouseVerification(h.id),null);
  assert.equal(byId(restored.state.houses,h.id).name,"New house");
});
test("house creation and editing reject wrong roles, stale versions and invalid coordinates", () => {
  const d=demo(), count=d.state.houses.length;
  for(const role of ["tenant","admin"]) {d.state.role=role; d.submit("house",newHouseValues());}
  assert.equal(d.state.houses.length,count); d.state.role="landlord";
  d.submit("house",newHouseValues({latitude:"10",longitude:""})); assert.equal(d.state.houses.length,count);
  const h=byId(d.state.houses,"h1"), before=JSON.stringify(h);
  d.submit("house",newHouseValues({houseId:h.id,originalVersion:"0"})); assert.equal(JSON.stringify(h),before);
  h.ownerId="huong"; const foreign=JSON.stringify(h);
  d.submit("house",newHouseValues({houseId:h.id,originalVersion:String(h.version)})); assert.equal(JSON.stringify(h),foreign);
});
test("a draft house can add rooms but pending posts cannot be published without verification", () => {
  const d=demo(); d.submit("house",newHouseValues()); const h=d.state.houses.at(-1);
  d.submit("room",{roomId:"",code:"N101",area:"20",price:"3000000",deposit:"3000000",capacity:"2",status:"AVAILABLE"});
  const r=d.state.rooms.at(-1); assert.equal(r.houseId,h.id);
  const p={id:"pending-new-house",roomId:r.id,status:"PENDING_REVIEW",title:"New post"};d.state.posts.push(p);
  d.state.role="admin";d.action("approve-listing",p.id);assert.equal(p.status,"PENDING_REVIEW");
});
test("proof submissions require the evidence for each right type and delegated expiry", async () => {
  for(const rightType of ["OWNER","AUTHORIZED","SUBLESSOR"]) {
    const d=demo();d.submit("house",newHouseValues());const h=d.state.houses.at(-1),before=d.state.houseVerifications.length;
    const values=houseProofValues(d,h.id,{rightType,document_OWNER_PROOF:[],validUntil:""});
    await d.submit("house-verification",values);assert.equal(d.state.houseVerifications.length,before);
    if(rightType==="OWNER")values.document_OWNER_PROOF=pdfProof;
    if(rightType==="AUTHORIZED"){values.document_OWNER_PROOF=pdfProof;values.document_AUTHORIZATION=pdfProof;values.validUntil="2027-10-24";}
    if(rightType==="SUBLESSOR"){values.document_LEASE_AGREEMENT=pdfProof;values.document_SUBLET_CONSENT=pdfProof;values.validUntil="2027-10-24";}
    await d.submit("house-verification",values);assert.equal(d.state.houseVerifications.length,before+1);
    assert.equal(d.state.houseVerifications.at(-1).status,"PENDING");assert.equal(d.api.effectiveHouseVerification(h.id),null);
  }
});
test("concurrent submissions and duplicate submissions create only one pending house application", async () => {
  const d=demo();d.submit("house",newHouseValues());const h=d.state.houses.at(-1),before=d.state.houseVerifications.length;
  const values=houseProofValues(d,h.id);
  await Promise.all([d.submit("house-verification",values),d.submit("house-verification",values)]);
  await d.submit("house-verification",values);assert.equal(d.state.houseVerifications.length,before+1);
  assert.equal(d.state.houseVerificationDocuments.filter(x=>x.verificationId===d.state.houseVerifications.at(-1).id).length,1);
});
test("proof approval requires admin evidence confirmation then allows publication", async () => {
  const d=demo();d.submit("house",newHouseValues());const h=d.state.houses.at(-1);
  await d.submit("house-verification",houseProofValues(d,h.id));const v=d.state.houseVerifications.at(-1);
  d.submit("house-verification-decision",{verificationId:v.id,decision:"APPROVE",checkedEvidence:"yes"});assert.equal(v.status,"PENDING");
  d.state.role="admin";d.submit("house-verification-decision",{verificationId:v.id,decision:"APPROVE"});assert.equal(v.status,"PENDING");
  approveHouseProof(d,v.id);assert.equal(v.status,"APPROVED");assert.ok(v.evidenceCheckedAt);
  assert.equal(d.api.effectiveHouseVerification(h.id).id,v.id);
  d.state.role="landlord";d.state.houseSelection=h.id;
  d.submit("room",{code:"N101",area:"20",price:"3000000",deposit:"3000000",capacity:"2",status:"AVAILABLE"});
  const r=d.state.rooms.at(-1),p={id:"post-verified",roomId:r.id,status:"PENDING_REVIEW"};d.state.posts.push(p);
  d.state.role="admin";d.action("approve-listing",p.id);assert.equal(p.status,"APPROVED");
});
test("rejection, withdrawal, resubmission and revocation preserve application history", async () => {
  const d=demo();d.submit("house",newHouseValues());const h=d.state.houses.at(-1);
  const submit=()=>d.submit("house-verification",houseProofValues(d,h.id));await submit();const first=d.state.houseVerifications.at(-1);
  d.state.role="admin";d.submit("house-verification-decision",{verificationId:first.id,decision:"REJECT",reason:""});assert.equal(first.status,"PENDING");
  d.submit("house-verification-decision",{verificationId:first.id,decision:"REJECT",reason:"Address mismatch"});assert.equal(first.status,"REJECTED");
  d.state.role="landlord";await submit();const second=d.state.houseVerifications.at(-1);d.action("withdraw-house-verification",second.id);assert.equal(second.status,"WITHDRAWN");
  await submit();const third=d.state.houseVerifications.at(-1);approveHouseProof(d,third.id);
  d.submit("house-verification-decision",{verificationId:third.id,decision:"REVOKE",reason:"Authorization withdrawn"});
  assert.equal(third.status,"REVOKED");assert.equal(d.api.effectiveHouseVerification(h.id),null);
  assert.equal(d.state.houseVerifications.filter(x=>x.houseId===h.id).length,3);
});
test("name changes keep approval; identity changes invalidate rights and withdraw stale pending applications", async () => {
  const d=demo(),h=byId(d.state.houses,"h1"),v=d.api.effectiveHouseVerification(h.id);
  const values={...h,houseId:h.id,originalVersion:String(h.version),name:"Updated name",provinceCode:"01",latitude:"",longitude:""};
  d.submit("house",values);assert.equal(d.api.effectiveHouseVerification(h.id).id,v.id);
  await d.submit("house-verification",houseProofValues(d,h.id));const pending=d.state.houseVerifications.at(-1);
  d.submit("house",{...values,originalVersion:String(h.version),address:"Different address"});
  assert.equal(pending.status,"WITHDRAWN");assert.equal(d.api.effectiveHouseVerification(h.id),null);assert.equal(v.status,"APPROVED");
  d.state.role="tenant";d.action("post-detail",d.state.posts.find(p=>p.roomId==="r3").id);
  assert.doesNotMatch(d.node("#app-main").innerHTML,/data-room-resident-id/);
});
test("expired or revoked rights block new leases and renewals while preserving active rental history", () => {
  const d=demo(),v=d.api.effectiveHouseVerification("h1"),before=JSON.stringify(d.state.contracts);
  v.validUntil="2026-10-23";assert.equal(d.api.effectiveHouseVerification("h1"),null);
  d.action("open-contract","v2");assert.doesNotMatch(d.node("#dialog-body").innerHTML,/data-form="create-contract"/);
  const request=change(d,"RENEWAL",{newEnd:"2028-10-24"});const end=k2(d).end;d.action("apply-change",request.id);assert.equal(k2(d).end,end);
  assert.equal(JSON.stringify(d.state.contracts),before);
  d.action("move-out","k2:o3");assert.equal(k2(d).members[1].status,"LEFT");
});
test("legacy custom houses never inherit seed demonstration approvals", () => {
  const d=demo(),saved=JSON.parse(JSON.stringify(d.state));delete saved.houseVerifications;delete saved.houseVerificationDocuments;delete saved.houseProofFiles;
  byId(saved.houses,"h1").address="Legacy custom address";saved.houses.push({id:"legacy",ownerId:"quan",name:"Legacy",address:"Other"});
  const restored=demo(saved);assert.equal(restored.api.effectiveHouseVerification("h1"),null);assert.equal(restored.api.effectiveHouseVerification("legacy"),null);
  assert.ok(restored.api.effectiveHouseVerification("h2"));
});
test("revocation between lease steps prevents confirmation and activation without deleting the pending lease", () => {
  const d=demo(),c=byId(d.state.contracts,"k1");d.api.effectiveHouseVerification("h1").status="REVOKED";
  d.state.role="tenant";d.action("confirm-contract",c.id);assert.equal(c.status,"PENDING_CONFIRMATION");
  c.status="CONFIRMED";c.revisionStatus="CONFIRMED";d.state.role="landlord";
  const before=JSON.stringify(c);d.submit("move-in",{contractId:c.id,date:"2026-10-24",memberIds:[c.members[0].id]});
  assert.equal(JSON.stringify(c),before);
  d.submit("create-contract",{viewingId:"v2"});assert.equal(d.state.contracts.filter(x=>x.viewingId==="v2").length,0);
});
test("proof uploads reject unsupported and oversized files, and admins cannot approve future rights", async () => {
  const d=demo();d.submit("house",newHouseValues());const h=d.state.houses.at(-1),before=d.state.houseVerifications.length;
  for(const file of [{name:"script.html",type:"text/html",size:100},{...pdfProof,size:5242881}]) {
    await d.submit("house-verification",houseProofValues(d,h.id,{document_OWNER_PROOF:file}));assert.equal(d.state.houseVerifications.length,before);
  }
  await d.submit("house-verification",houseProofValues(d,h.id,{validFrom:"2027-01-01"}));const v=d.state.houseVerifications.at(-1);
  approveHouseProof(d,v.id);assert.equal(v.status,"PENDING");assert.equal(d.api.effectiveHouseVerification(h.id),null);
});
const viewingCard = (d, id) => d.node("#app-main").innerHTML.match(new RegExp('<article class="chat-viewing-card" data-viewing-id="' + id + '">([\\s\\S]*?)</article>'))?.[1] || "";
const roomDetailSection = (d, name) => d.node("#app-main").innerHTML.match(new RegExp(`<section data-room-${name}>([\\s\\S]*?)</section>`))?.[1] || "";
const k2 = (d) => byId(d.state.contracts, "k2");
const join = (d) => byId(d.state.joinRequests, "join1");
const roommateProfileValues = (extra = {}) => ({ location: "Cầu Giấy, Thanh Xuân", budgetMin: "2000000", budgetMax: "4000000", habits: "Không hút thuốc · Giữ vệ sinh chung", available: "2026-11-01", housingStatus: "NO_ACCOMMODATION", currentRoomTenantId: "", ...extra });
// Scenarios for a new rental or self-declared housing first end Lan's current stay.
function leaveSampleRental(d) {
  const previousRole = d.state.role;
  d.state.role = "landlord"; d.action("move-out", "k4:o5"); d.state.role = previousRole;
}
function lanChangeValues(d, extra = {}) {
  const c = byId(d.state.contracts, "k4");
  return { contractId: c.id, type: "RENEWAL", effective: "2026-10-24", newEnd: "2028-09-30", note: "Mong gia hạn thêm 12 tháng", baseRevisionNo: String(c.revisionNo), representativeId: c.members[0].id, ...extra };
}
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
  leaveSampleRental(d);
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
  leaveSampleRental(d);
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

test("sending a chat message notifies its recipient and never shows a popup to the sender", () => {
  const d = demo(); d.state.role = "tenant"; d.action("navigate", "chats"); d.action("select-chat", "c1");
  d.submit("chat-message", { message: '<b>Phòng còn trống không?</b>' });
  const notice = d.state.notifications.at(-1), message = byId(d.state.conversations, "c1").messages.at(-1);
  assert.equal(notice.type, "CHAT_MESSAGE"); assert.equal(notice.userId, "quan");
  assert.equal(notice.senderId, "lan"); assert.equal(notice.messageId, message.id); assert.equal(notice.conversationId, "c1");
  assert.equal(notice.read, false); assert.equal(d.node("#notification-popups").innerHTML, "");
  d.action("switch-role", "landlord");
  assert.match(d.node("#notification-popups").innerHTML, /Tin nhắn mới từ Trần Ngọc Lan/);
  assert.match(d.node("#notification-popups").innerHTML, /&lt;b&gt;Phòng còn trống/);
  assert.doesNotMatch(d.node("#notification-popups").innerHTML, /<b>Phòng/);
  d.action("open-notification", notice.id);
  assert.equal(d.state.view, "chats"); assert.equal(d.state.selectedConversation, "c1");
  assert.equal(d.state.chatMobileOpen, true); assert.equal(notice.read, true);
});

test("a cross-tab delivery preserves the receiver's role, page, draft and dialog and does not replay", () => {
  const sender = demo(); sender.state.role = "tenant"; sender.action("navigate", "chats"); sender.action("select-chat", "c1");
  sender.submit("chat-message", { message: "Tin gửi từ tab người thuê" });
  const receiver = demo(); receiver.state.view = "dashboard";
  receiver.state.chatDrafts["quan:c1"] = "Nội dung chưa gửi";
  receiver.node("#dialog-body").innerHTML = "Form đang nhập";
  const event = { key: "troday-wireframe-v5-20261023", newValue: JSON.stringify(sender.state) };
  receiver.api.receiveSharedState(event);
  assert.equal(receiver.state.role, "landlord"); assert.equal(receiver.state.view, "dashboard");
  assert.equal(receiver.state.chatDrafts["quan:c1"], "Nội dung chưa gửi");
  assert.equal(receiver.node("#dialog-body").innerHTML, "Form đang nhập");
  assert.match(receiver.node("#notification-popups").innerHTML, /Tin gửi từ tab người thuê/);
  const id = sender.state.notifications.at(-1).id;
  receiver.action("dismiss-notification", id);
  assert.equal(byId(receiver.state.notifications, id).read, false);
  receiver.api.receiveSharedState(event); receiver.api.render();
  assert.equal(receiver.node("#notification-popups").innerHTML, "");
  assert.equal(receiver.state.notifications.filter((n) => n.id === id).length, 1);
  const restored = demo(receiver.state); restored.api.render();
  assert.equal(restored.node("#notification-popups").innerHTML, "");
  assert.equal(byId(restored.state.notifications, id).read, false);
});

test("messages in the conversation being read appear directly without a popup and keep the draft", () => {
  const sender = demo(); sender.state.role = "tenant"; sender.action("navigate", "chats"); sender.action("select-chat", "c1");
  const receiver = demo(); receiver.action("navigate", "chats"); receiver.action("select-chat", "c1");
  receiver.state.chatDrafts["quan:c1"] = "Tôi đang soạn câu trả lời";
  sender.submit("chat-message", { message: "Tin đến khi cuộc chat đang mở" });
  receiver.api.receiveSharedState({ key: "troday-wireframe-v5-20261023", newValue: JSON.stringify(sender.state) });
  assert.match(receiver.node("#app-main").innerHTML, /Tin đến khi cuộc chat đang mở/);
  assert.match(receiver.node("#app-main").innerHTML, /Tôi đang soạn câu trả lời/);
  assert.equal(receiver.node("#notification-popups").innerHTML, "");
  assert.equal(receiver.state.notifications.at(-1).read, true);
});

test("generic alerts are capped at three, expire without marking read and remain in the feed", () => {
  const d = demo();
  for (let index = 0; index < 4; index++) d.state.notifications.push({ id: `new-${index}`, userId: "quan", text: `Thông báo mới ${index}`, read: false });
  d.api.render();
  assert.equal((d.node("#notification-popups").innerHTML.match(/data-popup-notification=/g) || []).length, 3);
  assert.doesNotMatch(d.node("#notification-popups").innerHTML, /data-popup-notification="new-0"/);
  d.expirePopups();
  assert.equal(d.node("#notification-popups").innerHTML, "");
  assert.ok(d.state.notifications.filter((n) => n.id.startsWith("new-")).every((n) => !n.read));
  d.action("notifications"); assert.match(d.node("#dialog-body").innerHTML, /Thông báo mới 3/);
  d.api.render(); assert.equal(d.node("#notification-popups").innerHTML, "");
});

test("foreign or inaccessible chat alerts do not disclose messages or open a conversation", () => {
  const d = demo(); d.state.view = "dashboard";
  d.state.notifications.push({ id: "foreign", userId: "lan", text: "Không được hiển thị", read: false });
  d.state.notifications.push({ id: "invalid-chat", userId: "quan", type: "CHAT_MESSAGE", conversationId: "c2", messageId: "m6", senderId: "lan", preview: "Không tham gia hội thoại", read: false });
  d.api.render(); assert.equal(d.node("#notification-popups").innerHTML, "");
  d.action("open-notification", "foreign"); d.action("open-notification", "invalid-chat");
  assert.equal(d.state.view, "dashboard"); assert.equal(byId(d.state.notifications, "foreign").read, false);
  const before = JSON.stringify(d.state.conversations);
  for (const event of [{ key: "other", newValue: "{}" }, { key: "troday-wireframe-v5-20261023", newValue: "bad-json" }, { key: "troday-wireframe-v5-20261023", newValue: "null" }]) d.api.receiveSharedState(event);
  assert.equal(JSON.stringify(d.state.conversations), before);
});

test("sharing a listing also creates a message alert for the connected roommate", () => {
  const d = demo(); d.state.role = "tenant"; d.action("accept-roommate", "rm1");
  d.submit("share-post", { inviteId: "rm1", postId: "p-r2", note: "Bạn xem phòng này nhé" });
  const n = d.state.notifications.at(-1);
  assert.equal(n.type, "CHAT_MESSAGE"); assert.equal(n.userId, "bao");
  assert.match(n.preview, /Đã chia sẻ:/); assert.equal(n.conversationId, d.state.selectedConversation);
});

test("roommate tabs isolate their lists, count all invitation statuses and restore the chosen tab", () => {
  const d = demo(); d.state.role = "tenant"; d.action("navigate", "roommates");
  assert.match(d.node("#app-main").innerHTML, /id="roommate-tab-matches"[^>]*aria-selected="true"/);
  assert.match(d.node("#app-main").innerHTML, /id="roommate-tab-incoming"[^>]*>.*?<span class="tab-count">2<\/span>/);
  assert.doesNotMatch(d.node("#app-main").innerHTML, /Mình đang tìm phòng khu Cầu Giấy/);
  d.action("roommate-tab", "incoming");
  assert.match(d.node("#app-main").innerHTML, /Mình đang tìm phòng khu Cầu Giấy/);
  assert.match(d.node("#app-main").innerHTML, /data-action="reject-roommate"/);
  d.action("reject-roommate", "rm1");
  assert.match(d.node("#app-main").innerHTML, /Đã từ chối/);
  assert.match(d.node("#app-main").innerHTML, /id="roommate-tab-incoming"[^>]*>.*?<span class="tab-count">2<\/span>/);
  d.action("roommate-tab", "outgoing");
  assert.match(d.node("#app-main").innerHTML, /Chưa gửi lời mời/);
  assert.doesNotMatch(d.node("#app-main").innerHTML, /data-action="roommate-profile"/);
  d.submit("roommate-profile", roommateProfileValues({ housingStatus: "IN_SYSTEM", currentRoomTenantId: "o5" }));
  d.action("send-roommate", "ngoc");
  assert.equal(d.state.roommateTab, "outgoing");
  assert.match(d.node("#app-main").innerHTML, /id="roommate-tab-outgoing"[^>]*>.*?<span class="tab-count">1<\/span>/);
  assert.match(d.node("#app-main").innerHTML, /Chờ phản hồi/);
  const restored = demo(d.state); restored.state.role = "tenant"; restored.action("navigate", "roommates");
  assert.match(restored.node("#app-main").innerHTML, /id="roommate-tab-outgoing"[^>]*aria-selected="true"/);
  restored.action("roommate-tab", "invalid"); assert.equal(restored.state.roommateTab, "outgoing");
  restored.state.roommateTab = "legacy"; restored.api.render();
  assert.match(restored.node("#app-main").innerHTML, /id="roommate-tab-matches"[^>]*aria-selected="true"/);
});

test("the active rental example shows Lan's room, contract term and three separate request actions", () => {
  const d = demo(); d.state.role = "tenant"; d.action("navigate", "contracts");
  assert.equal(d.state.selectedContract, "k4");
  const html = d.node("#app-main").innerHTML;
  assert.match(html, /Phòng đang thuê: P203/); assert.match(html, /HD-2026-099/); assert.match(html, /Còn hiệu lực/);
  assert.match(html, /Bắt đầu: 1\/10\/2026/); assert.match(html, /Kết thúc: 30\/9\/2027/);
  for (const action of ["open-renewal", "open-transfer", "open-termination"]) assert.match(html, new RegExp(`data-action="${action}"`));
  d.action("create-roommate-profile");
  assert.match(d.node("#dialog-body").innerHTML, /name="currentRoomTenantId" value="o5"/);
  assert.match(d.node("#dialog-body").innerHTML, /Đang ở P203/);
  d.action("close-dialog"); d.action("contract-detail", "k3");
  assert.doesNotMatch(d.node("#app-main").innerHTML, /data-action="open-renewal"/);
});

test("older demos gain the rental example once without replacing edits, existing stays or ended contracts", () => {
  const old = structuredClone(demo().state);
  old.contracts = old.contracts.filter((c) => c.id !== "k4"); old.rooms = old.rooms.filter((r) => r.id !== "r7");
  delete old.lanActiveContractSeeded; old.rooms[0].title = "Tên đã chỉnh";
  const d = demo(old);
  assert.equal(d.state.contracts.filter((c) => c.number === "HD-2026-099").length, 1);
  assert.equal(d.state.rooms[0].title, "Tên đã chỉnh");
  assert.equal(d.state.posts.some((p) => p.roomId === "r7"), false);
  leaveSampleRental(d);
  const restored = demo(d.state);
  assert.equal(byId(restored.state.contracts, "k4").status, "TERMINATED");
  assert.equal(restored.state.contracts.filter((c) => c.id === "k4").length, 1);
  const housed = structuredClone(old), c = byId(housed.contracts, "k1");
  c.status = "ACTIVE"; c.members[0].status = "ACTIVE";
  const preserved = demo(housed);
  assert.equal(preserved.state.contracts.some((c) => c.id === "k4"), false);
  assert.equal(preserved.state.rooms.some((r) => r.id === "r7"), false);
});

test("renewal changes the agreed end date only after owner review, tenant confirmation and owner application", () => {
  const d = demo(); d.state.role = "tenant"; d.action("contract-detail", "k4");
  const c = byId(d.state.contracts, "k4"), originalEnd = c.end;
  d.action("open-renewal", c.id);
  assert.match(d.node("#dialog-body").innerHTML, /name="type" value="RENEWAL"/);
  assert.match(d.node("#dialog-body").innerHTML, /name="newEnd"/);
  d.submit("change-request", lanChangeValues(d));
  const request = d.state.changeRequests.at(-1);
  assert.equal(request.status, "PENDING"); assert.equal(c.end, originalEnd);
  d.action("approve-change", request.id); assert.equal(request.status, "PENDING");
  d.state.role = "landlord"; d.action("apply-change", request.id); assert.equal(c.end, originalEnd);
  d.action("approve-change", request.id);
  assert.equal(request.status, "APPROVED_WAITING_CONFIRMATION"); assert.equal(request.reviewedBy, "quan");
  d.action("apply-change", request.id); assert.equal(c.end, originalEnd);
  d.state.role = "tenant"; d.action("accept-change", request.id);
  assert.equal(request.status, "READY_TO_APPLY"); assert.equal(request.tenantConfirmedBy, "lan");
  assert.equal(c.end, originalEnd);
  d.action("apply-change", request.id); assert.equal(c.end, originalEnd);
  d.state.role = "landlord"; d.action("apply-change", request.id);
  assert.equal(c.end, "2028-09-30"); assert.equal(c.revisionNo, 2); assert.equal(request.status, "COMPLETED");
  assert.equal(c.revisions.at(-1).changeRequestId, request.id);
  d.action("apply-change", request.id); assert.equal(c.revisionNo, 2);
  const restored = demo(d.state); restored.state.role = "tenant"; restored.action("contract-detail", c.id);
  assert.equal(byId(restored.state.contracts, c.id).end, "2028-09-30");
  assert.match(restored.node("#app-main").innerHTML, /Đã áp dụng/);
});

test("request rejection requires the owner and a reason, retains history and allows a new request", () => {
  const d = demo(); d.state.role = "tenant";
  d.submit("change-request", lanChangeValues(d)); const request = d.state.changeRequests.at(-1);
  d.submit("reject-change", { requestId: request.id, reason: "Không có quyền" }); assert.equal(request.status, "PENDING");
  d.state.role = "landlord"; d.action("reject-change", request.id);
  assert.match(d.node("#dialog-body").innerHTML, /Lý do từ chối/);
  d.submit("reject-change", { requestId: request.id, reason: "   " }); assert.equal(request.status, "PENDING");
  d.submit("reject-change", { requestId: request.id, reason: "Cần trao đổi thêm thời hạn" });
  assert.equal(request.status, "REJECTED"); assert.equal(request.reviewedBy, "quan");
  assert.equal(byId(d.state.contracts, "k4").end, "2027-09-30");
  d.state.role = "tenant"; d.action("contract-detail", "k4");
  assert.match(d.node("#app-main").innerHTML, /Cần trao đổi thêm thời hạn/);
  d.submit("change-request", lanChangeValues(d));
  assert.notEqual(d.state.changeRequests.at(-1).id, request.id);
  assert.equal(d.state.changeRequests.at(-1).status, "PENDING");
});

test("request forms validate dates, type, current revision and representative and prevent duplicate open requests", () => {
  const d = demo(); d.state.role = "tenant";
  const count = d.state.changeRequests.length;
  for (const fields of [
    { type: "UNKNOWN" }, { newEnd: "" }, { newEnd: "2027-09-30" }, { newEnd: "2028-02-30" },
    { effective: "2026-10-23" }, { effective: "2029-01-01" }, { effective: "" }, { note: " " },
    { baseRevisionNo: "9" }, { representativeId: "o2" }, { contractId: "k2" },
    { type: "TRANSFER", targetRoom: "r7" }, { type: "TRANSFER", targetRoom: "r4" },
    { type: "TERMINATION", effective: "2028-01-01" }
  ]) {
    d.submit("change-request", lanChangeValues(d, fields));
    assert.equal(d.state.changeRequests.length, count, JSON.stringify(fields));
  }
  d.submit("change-request", lanChangeValues(d));
  d.submit("change-request", lanChangeValues(d)); assert.equal(d.state.changeRequests.length, count + 1);
  d.action("open-termination", "k4"); assert.equal(d.node("#app-dialog").open, false);
});

test("a future renewal cannot apply early and a stale approved proposal cannot modify the contract", () => {
  const d = demo(); d.state.role = "tenant";
  d.submit("change-request", lanChangeValues(d, { effective: "2026-10-25" }));
  const request = d.state.changeRequests.at(-1), c = byId(d.state.contracts, "k4");
  d.state.role = "landlord"; d.action("approve-change", request.id);
  d.state.role = "tenant"; d.action("accept-change", request.id);
  d.state.role = "landlord"; d.action("apply-change", request.id);
  assert.equal(request.status, "READY_TO_APPLY"); assert.equal(c.revisionNo, 1);
  d.action("navigate", "contracts");
  assert.match(d.node("#app-main").innerHTML, /disabled title="Chờ đến ngày hiệu lực/);
  d.now("2026-10-25T03:00:00Z"); c.revisionNo = 2;
  const before = JSON.stringify(c); d.action("apply-change", request.id);
  assert.equal(JSON.stringify(c), before); assert.equal(request.status, "READY_TO_APPLY");
  c.revisionNo = 1; d.action("apply-change", request.id);
  assert.equal(request.status, "COMPLETED"); assert.equal(c.end, "2028-09-30");
});

test("only the owning landlord reviews and only the current representative confirms a request", () => {
  const d = demo(); d.state.role = "tenant";
  d.submit("change-request", lanChangeValues(d));
  const request = d.state.changeRequests.at(-1), c = byId(d.state.contracts, "k4");
  d.state.role = "landlord"; c.ownerId = "huong";
  d.action("approve-change", request.id); d.action("reject-change", request.id);
  assert.equal(request.status, "PENDING");
  c.ownerId = "quan"; d.action("approve-change", request.id);
  d.state.role = "tenant"; c.tenantId = "bao";
  d.action("accept-change", request.id); assert.equal(request.status, "APPROVED_WAITING_CONFIRMATION");
  c.tenantId = "lan"; c.revisionNo = 2;
  d.action("accept-change", request.id); assert.equal(request.status, "APPROVED_WAITING_CONFIRMATION");
  c.revisionNo = 1; d.action("accept-change", request.id); assert.equal(request.status, "READY_TO_APPLY");
});

test("the separate transfer and termination actions retain their own fields and approval workflow", () => {
  for (const [action, type] of [["open-transfer", "TRANSFER"], ["open-termination", "TERMINATION"]]) {
    const d = demo(); d.state.role = "tenant"; d.action(action, "k4");
    assert.match(d.node("#dialog-body").innerHTML, new RegExp(`name="type" value="${type}"`));
    if (type === "TRANSFER") assert.match(d.node("#dialog-body").innerHTML, /name="targetRoom"/);
    else assert.doesNotMatch(d.node("#dialog-body").innerHTML, /name="targetRoom"|name="newEnd"/);
    d.submit("change-request", lanChangeValues(d, { type, targetRoom: "r1" }));
    const request = d.state.changeRequests.at(-1);
    d.state.role = "landlord"; d.action("approve-change", request.id);
    d.state.role = "tenant"; d.action("accept-change", request.id);
    d.state.role = "landlord"; d.action("apply-change", request.id);
    assert.equal(request.status, "COMPLETED");
    assert.equal(byId(d.state.contracts, "k4").status, "TERMINATED");
    assert.equal(byId(d.state.contracts, "k4").members[0].status, "LEFT");
    if (type === "TRANSFER") assert.equal(byId(d.state.contracts, request.resultContractId).roomId, "r1");
  }
});

test("a fresh tenant starts without a profile and cancelling creation leaves rental data untouched", () => {
  const d = demo(); d.state.role = "tenant"; d.action("navigate", "roommates");
  assert.equal(d.state.roommateProfile, null);
  assert.match(d.node("#app-main").innerHTML, /Chưa có hồ sơ ở ghép/);
  assert.match(d.node("#app-main").innerHTML, /data-action="create-roommate-profile"/);
  assert.doesNotMatch(d.node("#app-main").innerHTML, /data-action="edit-roommate-profile"/);
  const before = JSON.stringify({ contracts: d.state.contracts, joins: d.state.joinRequests, invites: d.state.roommateInvites, rooms: d.state.rooms });
  d.action("create-roommate-profile");
  assert.equal(d.node("#app-dialog").open, true);
  assert.match(d.node("#dialog-body").innerHTML, /Tạo hồ sơ ở ghép/);
  assert.match(d.node("#dialog-body").innerHTML, /name="location" value=""/);
  d.action("close-dialog");
  assert.equal(d.state.roommateProfile, null);
  assert.equal(JSON.stringify({ contracts: d.state.contracts, joins: d.state.joinRequests, invites: d.state.roommateInvites, rooms: d.state.rooms }), before);
});

test("creating a profile persists it and editing replaces the same profile without creating invitations", () => {
  const d = demo(); d.state.role = "tenant"; d.action("navigate", "roommates");
  leaveSampleRental(d);
  const invites = JSON.stringify(d.state.roommateInvites), peers = JSON.stringify(d.state.roommateProfiles);
  d.action("create-roommate-profile"); d.submit("roommate-profile", roommateProfileValues({ budgetMin: "0" }));
  assert.equal(d.node("#app-dialog").open, false);
  assert.equal(d.state.roommateProfile.active, true);
  assert.equal(d.state.roommateProfile.budgetMin, 0);
  assert.equal(d.state.roommateProfile.housingStatus, "NO_ACCOMMODATION");
  assert.equal(d.state.roommateProfile.currentRoomTenantId, null);
  assert.equal(d.state.roommateProfile.externalContext, null);
  assert.match(d.node("#app-main").innerHTML, /Chưa có chỗ ở/);
  assert.match(d.node("#app-main").innerHTML, /data-action="edit-roommate-profile"/);
  assert.doesNotMatch(d.node("#app-main").innerHTML, /data-action="create-roommate-profile"/);
  const createdAt = d.state.roommateProfile.createdAt;
  const restored = demo(d.state); restored.state.role = "tenant"; restored.action("navigate", "roommates");
  assert.equal(restored.state.roommateProfile.location, "Cầu Giấy, Thanh Xuân");
  restored.action("edit-roommate-profile");
  assert.match(restored.node("#dialog-body").innerHTML, /Sửa hồ sơ ở ghép/);
  assert.match(restored.node("#dialog-body").innerHTML, /value="NO_ACCOMMODATION" selected/);
  restored.now("2026-10-24T05:00:00Z");
  restored.submit("roommate-profile", roommateProfileValues({ location: "Đống Đa", budgetMin: "4000000", budgetMax: "4000000" }));
  assert.equal(restored.state.roommateProfile.location, "Đống Đa");
  assert.equal(restored.state.roommateProfile.createdAt, createdAt);
  assert.notEqual(restored.state.roommateProfile.updatedAt, createdAt);
  assert.equal(JSON.stringify(restored.state.roommateProfiles), peers);
  assert.equal(JSON.stringify(restored.state.roommateInvites), invites);
});

test("old automatically supplied profiles become prefilled drafts while existing connections remain usable", () => {
  const old = structuredClone(demo().state);
  old.roommateProfile = { location: "Khu vực đã sửa", budgetMin: 1000000, budgetMax: 2500000, habits: "Giờ giấc ổn định", available: "2026-12-01" };
  old.roommateInvites[0].status = "ACCEPTED";
  const d = demo(old); d.state.role = "tenant"; d.action("navigate", "roommates");
  leaveSampleRental(d);
  assert.equal(d.state.roommateProfile, null);
  assert.equal(d.state.roommateProfileDraft.location, "Khu vực đã sửa");
  d.action("create-roommate-profile");
  assert.match(d.node("#dialog-body").innerHTML, /value="Khu vực đã sửa"/);
  d.action("close-dialog"); d.action("chat-roommate", "rm1");
  assert.equal(d.state.view, "chats");
  d.submit("roommate-profile", roommateProfileValues({ location: old.roommateProfile.location }));
  assert.equal(d.state.roommateProfile.location, "Khu vực đã sửa");
  assert.equal(d.state.roommateProfileDraft, undefined);
  const restored = demo(d.state);
  assert.equal(restored.state.roommateProfile.active, true);
  assert.equal(restored.state.roommateProfileDraft, undefined);
});

test("new invitations require a created profile and creating one never sends an invitation implicitly", () => {
  const d = demo(); d.state.role = "tenant"; d.action("navigate", "roommates");
  leaveSampleRental(d);
  const count = d.state.roommateInvites.length;
  d.action("send-roommate", "ngoc");
  assert.equal(d.node("#app-dialog").open, true);
  assert.match(d.node("#dialog-body").innerHTML, /Tạo hồ sơ ở ghép/);
  assert.equal(d.state.roommateInvites.length, count);
  d.submit("roommate-profile", roommateProfileValues());
  assert.equal(d.state.roommateInvites.length, count);
  d.action("send-roommate", "ngoc");
  assert.equal(d.state.roommateInvites.length, count + 1);
  assert.equal(d.state.roommateInvites.at(-1).receiverId, "ngoc");
});

test("external housing is self-declared, escaped when shared and cleared when no longer applicable", () => {
  const d = demo(); d.state.role = "tenant"; d.action("navigate", "roommates");
  leaveSampleRental(d);
  const externalContext = '<img src=x onerror="alert(1)"> Đang thuê ở Cầu Giấy';
  d.submit("roommate-profile", roommateProfileValues({ housingStatus: "EXTERNAL", externalContext }));
  assert.equal(d.state.roommateProfile.externalContext, externalContext);
  assert.match(d.node("#app-main").innerHTML, /Đang ở ngoài hệ thống/);
  assert.match(d.node("#app-main").innerHTML, /&lt;img/);
  d.action("edit-roommate-profile");
  assert.match(d.node("#dialog-body").innerHTML, /value="EXTERNAL" selected/);
  assert.match(d.node("#dialog-body").innerHTML, /&lt;img/);
  d.action("close-dialog");
  d.submit("roommate-profile", roommateProfileValues({ externalContext }));
  assert.equal(d.state.roommateProfile.externalContext, null);
  assert.doesNotMatch(d.node("#app-main").innerHTML, /Đang thuê ở Cầu Giấy/);
  d.submit("roommate-profile", roommateProfileValues({ housingStatus: "EXTERNAL" }));
  assert.equal(d.state.roommateProfile.housingStatus, "EXTERNAL");
  assert.equal(d.state.roommateProfile.externalContext, null);
});

test("profile validation rejects incomplete, invalid or forged housing data without replacing a valid profile", () => {
  const d = demo(); d.state.role = "tenant";
  leaveSampleRental(d);
  d.submit("roommate-profile", roommateProfileValues());
  const before = JSON.stringify(d.state.roommateProfile);
  for (const fields of [
    { location: "   " }, { location: "x".repeat(501) }, { habits: "" }, { habits: "x".repeat(2001) },
    { available: "" }, { available: "2026-02-30" }, { budgetMin: "" }, { budgetMax: "" },
    { budgetMin: "NaN" }, { budgetMax: "Infinity" }, { budgetMin: "-1" }, { budgetMax: "1" },
    { housingStatus: "" }, { housingStatus: "IN_SYSTEM" }, { housingStatus: "OTHER" },
    { currentRoomTenantId: "o2" }, { housingStatus: "EXTERNAL", externalContext: "x".repeat(1001) }
  ]) {
    d.submit("roommate-profile", roommateProfileValues(fields));
    assert.equal(JSON.stringify(d.state.roommateProfile), before, JSON.stringify(fields).slice(0, 100));
  }
  for (const role of ["landlord", "admin"]) {
    d.state.role = role; d.action("create-roommate-profile");
    assert.equal(d.node("#app-dialog").open, false);
    d.submit("roommate-profile", roommateProfileValues({ location: "Không được thay đổi" }));
    assert.equal(JSON.stringify(d.state.roommateProfile), before);
  }
});

test("in-system housing uses a confirmed stay, rejects stale forms and follows actual move-in and move-out", () => {
  const d = demo(); d.state.role = "tenant";
  leaveSampleRental(d);
  d.submit("roommate-profile", roommateProfileValues({ housingStatus: "EXTERNAL", externalContext: "Chỗ ở tự khai" }));
  const c = byId(d.state.contracts, "k1"), member = c.members[0];
  c.status = "CONFIRMED";
  d.action("edit-roommate-profile");
  assert.doesNotMatch(d.node("#dialog-body").innerHTML, /name="housingStatus" value="IN_SYSTEM"/);
  member.status = "ACTIVE"; c.status = "ACTIVE";
  const before = JSON.stringify(d.state.roommateProfile);
  d.submit("roommate-profile", roommateProfileValues({ housingStatus: "EXTERNAL" }));
  assert.equal(JSON.stringify(d.state.roommateProfile), before);
  d.action("edit-roommate-profile");
  assert.match(d.node("#dialog-body").innerHTML, /name="housingStatus" value="IN_SYSTEM"/);
  assert.match(d.node("#dialog-body").innerHTML, /name="currentRoomTenantId" value="o1"/);
  assert.doesNotMatch(d.node("#dialog-body").innerHTML, /data-change="roommate-housing"/);
  d.submit("roommate-profile", roommateProfileValues({ housingStatus: "IN_SYSTEM", currentRoomTenantId: "o1", externalContext: "Không lưu" }));
  assert.equal(d.state.roommateProfile.currentRoomTenantId, "o1");
  assert.equal(d.state.roommateProfile.externalContext, null);
  d.action("navigate", "roommates");
  assert.match(d.node("#app-main").innerHTML, /Đang ở A02/);
  member.status = "LEFT"; c.status = "TERMINATED";
  const inSystem = JSON.stringify(d.state.roommateProfile);
  d.submit("roommate-profile", roommateProfileValues({ housingStatus: "IN_SYSTEM", currentRoomTenantId: "o1" }));
  assert.equal(JSON.stringify(d.state.roommateProfile), inSystem);
  d.api.render();
  assert.match(d.node("#app-main").innerHTML, /Cần cập nhật tình trạng chỗ ở/);
  assert.doesNotMatch(d.node("#app-main").innerHTML, /Đang ở A02/);
  d.submit("roommate-profile", roommateProfileValues({ housingStatus: "EXTERNAL" }));
  assert.equal(d.state.roommateProfile.currentRoomTenantId, null);
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
  leaveSampleRental(d);
  d.submit("roommate-profile", roommateProfileValues());
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

test("room detail renders one tab at a time and retains the selected tab in saved demos", () => {
  const d = demo(); delete d.state.roomDetailTab; d.action("room-detail", "r3");
  assert.match(d.node("#app-main").innerHTML, /data-related-post-id="p-r3"/);
  assert.equal(roomDetailSection(d, "residents"), ""); assert.equal(roomDetailSection(d, "services"), "");
  d.action("room-detail-tab", "residents");
  assert.match(roomDetailSection(d, "residents"), /Đỗ Bích Ngọc/);
  assert.equal(roomDetailSection(d, "services"), ""); assert.doesNotMatch(d.node("#app-main").innerHTML, /data-related-post-id/);
  d.action("room-detail-tab", "services");
  assert.match(roomDetailSection(d, "services"), /Gửi xe/); assert.equal(roomDetailSection(d, "residents"), "");
  d.action("room-detail-tab", "invalid"); assert.equal(d.state.roomDetailTab, "services");
  const reloaded = demo(d.state); reloaded.action("room-detail", "r3");
  assert.match(roomDetailSection(reloaded, "services"), /Gửi xe/);
  assert.equal(roomDetailSection(reloaded, "residents"), "");
  reloaded.action("room-detail-tab", "posts"); reloaded.action("room-post-detail", "p-r3"); reloaded.action("room-detail", "r3");
  assert.match(reloaded.node("#app-main").innerHTML, /data-related-post-id="p-r3"/);
});

test("room detail lists actual residents and updates the representative after a handover", () => {
  const d = demo(); d.action("room-detail", "r3"); d.action("room-detail-tab", "residents");
  const html = roomDetailSection(d, "residents");
  assert.match(html, /Người đang ở · 2\/3/);
  assert.match(html, /Phạm Thu Mai[\s\S]*Đại diện hợp đồng/); assert.match(html, /Đỗ Bích Ngọc/);
  assert.match(html, /1\/6\/2026/); assert.match(html, /1\/8\/2026/);
  assert.doesNotMatch(html, /Trần Ngọc Lan|001202|001204|2002|2004/);
  d.submit("representative-handover", { contractId: "k2", departingId: "o2", successorId: "o3", reason: "Mai rời phòng", consent: "yes" });
  d.action("room-detail", "r3"); const updated = roomDetailSection(d, "residents");
  assert.match(updated, /Người đang ở · 1\/3/); assert.doesNotMatch(updated, /Phạm Thu Mai/);
  assert.match(updated, /Đỗ Bích Ngọc[\s\S]*Đại diện hợp đồng/);
});

test("resident identities in room detail are restricted to its owner and administrators", () => {
  const d = demo(); d.state.role = "tenant"; d.action("room-detail", "r3"); d.action("room-detail-tab", "residents");
  assert.match(roomDetailSection(d, "residents"), /Phòng hiện có 2 người đang ở/);
  assert.doesNotMatch(d.node("#app-main").innerHTML, /Phạm Thu Mai|Đỗ Bích Ngọc|data-room-resident-id|001202|001204/);
  d.state.role = "admin"; d.api.render(); assert.match(roomDetailSection(d, "residents"), /Phạm Thu Mai/);
  byId(d.state.houses, "h1").ownerId = "huong";
  d.state.role = "landlord"; d.api.render();
  assert.equal(roomDetailSection(d, "residents"), "", "ownership change also invalidates public room access until verified again");
  assert.doesNotMatch(roomDetailSection(d, "residents"), /Phạm Thu Mai|Đỗ Bích Ngọc|data-room-resident-id/);
});

test("room detail keeps active stays on closed contracts and excludes planned, left and cancelled stays", () => {
  const d = demo(); k2(d).status = "TERMINATED";
  for (const status of ["PLANNED", "LEFT", "CANCELLED"]) k2(d).members.push({ id: status, name: `Excluded ${status}`, status });
  d.action("room-detail", "r3"); d.action("room-detail-tab", "residents");
  assert.match(roomDetailSection(d, "residents"), /Người đang ở · 2\/3/);
  assert.match(roomDetailSection(d, "residents"), /Đỗ Bích Ngọc/);
  assert.match(roomDetailSection(d, "residents"), /Cần đối soát trạng thái hợp đồng/);
  assert.doesNotMatch(roomDetailSection(d, "residents"), /Excluded/);
  d.action("room-detail", "r5"); assert.match(roomDetailSection(d, "residents"), /Chưa có người đang ở/);
  d.action("room-detail", "r1"); assert.match(roomDetailSection(d, "residents"), /Chưa có người đang ở/);
});

test("room detail shows only applied active services with effective room prices, including zero", () => {
  const d = demo(); d.action("room-detail", "r2"); d.action("room-detail-tab", "services");
  assert.match(roomDetailSection(d, "services"), /90\.000 đ\/phòng/);
  assert.match(roomDetailSection(d, "services"), /Giá riêng của phòng/);
  assert.match(roomDetailSection(d, "services"), /3\.800 đ\/kWh/);
  assert.match(roomDetailSection(d, "services"), /Theo đồng hồ|Theo phòng/);
  assert.doesNotMatch(roomDetailSection(d, "services"), /Gửi xe|100\.000/);
  d.state.roomServices.find((x) => x.roomId === "r2" && x.serviceId === "s3").override = 0;
  byId(d.state.services, "s1").active = false;
  d.state.roomServices.find((x) => x.roomId === "r2" && x.serviceId === "s2").active = false;
  d.state.roomServices.push({ roomId: "r2", serviceId: "s5", active: true, override: 12345 }, { roomId: "r2", serviceId: "missing", active: true });
  d.api.render(); const filtered = roomDetailSection(d, "services");
  assert.match(filtered, /Dịch vụ của phòng · 1/); assert.match(filtered, /0 đ\/phòng/);
  assert.doesNotMatch(filtered, /Điện|Nước|12\.345/);
  d.state.role = "tenant"; d.api.render(); assert.match(roomDetailSection(d, "services"), /0 đ\/phòng/);
  d.state.role = "landlord"; d.action("room-detail", "r3"); assert.match(roomDetailSection(d, "services"), /Theo người/);
  d.action("room-detail", "r6"); assert.match(roomDetailSection(d, "services"), /Chưa có dịch vụ áp dụng/);
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
