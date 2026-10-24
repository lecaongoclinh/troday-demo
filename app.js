const PHOTO = {
  r1: "assets/r1.webp",
  r2: "assets/r2.webp",
  r3: "assets/r3.webp",
  r4: "assets/r4.webp",
  r5: "assets/r5.webp",
  r6: "assets/r6.webp"
};

const PEOPLE = {
  lan: { name: "Trần Ngọc Lan", short: "Lan", initials: "NL", color: "" },
  quan: { name: "Nguyễn Minh Quân", short: "Anh Quân", initials: "MQ", color: "orange" },
  huong: { name: "Nguyễn Thu Hương", short: "Chị Hương", initials: "TH", color: "purple" },
  mai: { name: "Phạm Thu Mai", short: "Mai", initials: "TM", color: "purple" },
  ngoc: { name: "Đỗ Bích Ngọc", short: "Ngọc", initials: "BN", color: "" },
  bao: { name: "Lê Gia Bảo", short: "Bảo", initials: "GB", color: "orange" },
  admin: { name: "Đặng Huyền Anh", short: "Huyền Anh", initials: "HA", color: "purple" }
};

const NAV = {
  tenant: [
    ["discover", "Khám phá", "search"], ["favorites", "Đã lưu", "heart"],
    ["chats", "Tin nhắn", "message-circle"], ["viewings", "Lịch xem", "calendar-days"],
    ["contracts", "Hợp đồng", "file-text"], ["invoices", "Hóa đơn", "receipt"],
    ["roommates", "Ở ghép", "users"], ["profile", "Tài khoản", "user-round"]
  ],
  landlord: [
    ["dashboard", "Tổng quan", "layout-dashboard"], ["properties", "Nhà & phòng", "building-2"],
    ["services", "Dịch vụ", "plug-zap"], ["listings", "Tin đăng", "panel-top"],
    ["chats", "Tin nhắn", "message-circle"], ["viewings", "Lịch xem", "calendar-days"],
    ["contracts", "Hợp đồng", "file-text"], ["residents", "Người ở", "contact-round"],
    ["invoices", "Hóa đơn", "receipt"], ["profile", "Tài khoản", "user-round"]
  ],
  admin: [
    ["dashboard", "Tổng quan", "layout-dashboard"], ["verifications", "Xác minh", "badge-check"],
    ["moderation", "Duyệt tin", "panel-top"], ["templates", "Mẫu hợp đồng", "file-text"],
    ["reports", "Báo cáo", "flag"], ["users", "Người dùng", "users"],
    ["audit", "Nhật ký", "scroll-text"], ["profile", "Tài khoản", "user-round"]
  ]
};

const seed = {
  role: "tenant", view: "discover", selectedRoom: null, selectedConversation: "c1",
  chatContext: "r2", chatMobileOpen: false, chatDrafts: {}, chatContexts: {}, houseSelection: "h1", roomSelection: "r1",
  tab: "all", filters: { query: "", area: "all", maxPrice: "", minArea: "", amenity: "", distance: "" },
  favorites: ["r2"],
  houses: [
    { id: "h1", ownerId: "quan", name: "Nhà trọ An Nhiên", address: "85 Trần Duy Hưng, Cầu Giấy, Hà Nội", area: "Cầu Giấy" },
    { id: "h2", ownerId: "huong", name: "Nhà trọ Hương Giang", address: "12 Nguyễn Trãi, Thanh Xuân, Hà Nội", area: "Thanh Xuân" }
  ],
  rooms: [
    { id: "r1", code: "P101", houseId: "h1", title: "Studio sáng, đầy đủ nội thất", area: 22, price: 3800000, deposit: 3800000, capacity: 2, status: "AVAILABLE", distance: 1.2, photo: PHOTO.r1, amenities: ["Điều hòa", "Wi-Fi", "Máy giặt"], description: "Studio cửa sổ lớn, bếp riêng, vệ sinh khép kín. Giờ giấc tự do.", postStatus: "APPROVED" },
    { id: "r2", code: "P204", houseId: "h1", title: "Phòng ban công thoáng, gần công viên", area: 28, price: 4600000, deposit: 4600000, capacity: 2, status: "AVAILABLE", distance: 1.8, photo: PHOTO.r2, amenities: ["Ban công", "Điều hòa", "Wi-Fi"], description: "Ban công riêng, bếp gọn và chỗ để xe tầng một. Có thể vào ở ngay.", postStatus: "APPROVED" },
    { id: "r3", code: "P305", houseId: "h1", title: "Căn hộ mini 30 m²", area: 30, price: 5400000, deposit: 5400000, capacity: 3, status: "OCCUPIED", distance: 1.9, photo: PHOTO.r3, amenities: ["Điều hòa", "Thang máy", "Wi-Fi"], description: "Căn hộ mini có bếp riêng.", postStatus: "APPROVED" },
    { id: "r4", code: "B12", houseId: "h2", title: "Căn hộ nhỏ cạnh ga tàu", area: 24, price: 4100000, deposit: 4100000, capacity: 2, status: "AVAILABLE", distance: 2.4, photo: PHOTO.r4, amenities: ["Điều hòa", "Thang máy", "Máy giặt"], description: "Không gian yên tĩnh, có thang máy và bảo vệ 24/7.", postStatus: "APPROVED" },
    { id: "r5", code: "A02", houseId: "h1", title: "Phòng góc yên tĩnh", area: 18, price: 3200000, deposit: 3200000, capacity: 1, status: "RESERVED", distance: 1.3, photo: PHOTO.r5, amenities: ["Wi-Fi", "Máy giặt"], description: "Phòng một người, ánh sáng tự nhiên.", postStatus: "APPROVED" },
    { id: "r6", code: "P408", houseId: "h1", title: "Studio mới sửa tầng 4", area: 26, price: 4300000, deposit: 4300000, capacity: 2, status: "AVAILABLE", distance: 1.5, photo: PHOTO.r6, amenities: ["Wi-Fi", "Ban công"], description: "Phòng mới sửa, có ban công và khu phơi riêng.", postStatus: "PENDING_REVIEW" }
  ],
  services: [
    { id: "s1", houseId: "h1", name: "Điện", unit: "kWh", price: 3800, method: "METERED", active: true },
    { id: "s2", houseId: "h1", name: "Nước", unit: "m³", price: 28000, method: "METERED", active: true },
    { id: "s3", houseId: "h1", name: "Internet", unit: "phòng", price: 100000, method: "PER_ROOM", active: true },
    { id: "s4", houseId: "h1", name: "Gửi xe", unit: "người", price: 70000, method: "PER_PERSON", active: true },
    { id: "s5", houseId: "h2", name: "Điện", unit: "kWh", price: 4000, method: "METERED", active: true }
  ],
  roomServices: [
    { roomId: "r1", serviceId: "s1", active: true, override: null }, { roomId: "r1", serviceId: "s2", active: true, override: null }, { roomId: "r1", serviceId: "s3", active: true, override: null },
    { roomId: "r2", serviceId: "s1", active: true, override: null }, { roomId: "r2", serviceId: "s2", active: true, override: null }, { roomId: "r2", serviceId: "s3", active: true, override: 90000 },
    { roomId: "r3", serviceId: "s1", active: true, override: null }, { roomId: "r3", serviceId: "s2", active: true, override: null }, { roomId: "r3", serviceId: "s3", active: true, override: null }, { roomId: "r3", serviceId: "s4", active: true, override: null },
    { roomId: "r5", serviceId: "s1", active: true, override: null }, { roomId: "r5", serviceId: "s2", active: true, override: null }
  ],
  conversations: [
    { id: "c1", users: ["lan", "quan"], messages: [
      { id: "m1", senderId: "lan", roomId: "r1", text: "Chào anh, phòng P101 còn trống không ạ?", time: "09:14" },
      { id: "m2", senderId: "quan", roomId: "r1", text: "Còn em nhé. Phòng có thể xem chiều mai.", time: "09:16" },
      { id: "m3", senderId: "lan", roomId: "r2", text: "Em vừa xem P204, phòng này có ban công riêng không anh?", time: "10:32" },
      { id: "m4", senderId: "quan", roomId: "r2", text: "Có ban công riêng. Giá 4,6 triệu chưa gồm điện nước.", time: "10:35" },
      { id: "m5", senderId: "lan", roomId: "r1", text: "Vậy em muốn hẹn xem P101 vào cuối tuần ạ.", time: "11:08" }
    ] },
    { id: "c2", users: ["lan", "huong"], messages: [
      { id: "m6", senderId: "lan", roomId: "r4", text: "Chị ơi, phí gửi xe ở B12 là bao nhiêu ạ?", time: "08:40" },
      { id: "m7", senderId: "huong", roomId: "r4", text: "Miễn phí một xe máy em nhé.", time: "08:47" }
    ] },
    { id: "c3", users: ["mai", "quan"], messages: [
      { id: "m8", senderId: "mai", roomId: "r3", text: "Anh Quân ơi, em muốn cập nhật thông tin bạn ở cùng.", time: "08:22" }
    ] }
  ],
  viewingProposals: [],
  viewings: [
    { id: "v1", roomId: "r1", tenantId: "lan", ownerId: "quan", conversationId: "c1", date: "2026-10-25", time: "17:00", status: "SCHEDULED", decision: "WAITING" },
    { id: "v2", roomId: "r2", tenantId: "lan", ownerId: "quan", conversationId: "c1", date: "2026-10-22", time: "18:00", status: "COMPLETED", decision: "WAITING" },
    { id: "v3", roomId: "r5", tenantId: "lan", ownerId: "quan", conversationId: "c1", date: "2026-10-19", time: "16:00", status: "COMPLETED", decision: "AGREED" },
    { id: "v4", roomId: "r4", tenantId: "lan", ownerId: "huong", conversationId: "c2", date: "2026-10-27", time: "15:30", status: "SCHEDULED", decision: "WAITING" }
  ],
  contracts: [
    { id: "k1", number: "HD-2026-041", roomId: "r5", ownerId: "quan", tenantId: "lan", viewingId: "v3", source: "NEW_RENTAL", status: "PENDING_CONFIRMATION", revisionNo: 1, revisionStatus: "PENDING_CONFIRMATION", start: "2026-10-23", end: "2027-10-22", rent: 3200000, deposit: 3200000, terms: "Thanh toán trước ngày 05 hằng tháng. Báo trước 30 ngày khi kết thúc.", feedback: "", members: [{ id: "o1", tenantId: "lan", name: "Trần Ngọc Lan", identity: "001206******", dob: "2002-04-12", status: "PLANNED", moveIn: "" }], revisions: [{ version: 1, status: "PENDING_CONFIRMATION" }] },
    { id: "k2", number: "HD-2026-018", roomId: "r3", ownerId: "quan", tenantId: "mai", viewingId: null, source: "PAPER_IMPORT", status: "ACTIVE", revisionNo: 1, revisionStatus: "IMPORTED", start: "2026-06-01", end: "2027-05-31", rent: 5400000, deposit: 5400000, terms: "Thanh toán trước ngày 05 hằng tháng.", feedback: "", members: [{ id: "o2", tenantId: "mai", name: "Phạm Thu Mai", identity: "001202******", dob: "2002-06-15", status: "ACTIVE", moveIn: "2026-06-01" }, { id: "o3", tenantId: "ngoc", name: "Đỗ Bích Ngọc", identity: "001204******", dob: "2004-01-09", status: "ACTIVE", moveIn: "2026-08-01" }], revisions: [{ version: 1, status: "IMPORTED" }] },
    { id: "k3", number: "HD-2025-072", roomId: "r1", ownerId: "quan", tenantId: "lan", viewingId: null, source: "PAPER_IMPORT", status: "TERMINATED", revisionNo: 1, revisionStatus: "IMPORTED", start: "2025-09-01", end: "2026-08-31", rent: 3700000, deposit: 3700000, terms: "Hợp đồng lưu từ hồ sơ giấy.", feedback: "", members: [{ id: "o4", tenantId: "lan", name: "Trần Ngọc Lan", identity: "001206******", dob: "2002-04-12", status: "LEFT", moveIn: "2025-09-01" }], revisions: [{ version: 1, status: "IMPORTED" }] }
  ],
  changeRequests: [{ id: "chg1", contractId: "k2", type: "RENEWAL", status: "PENDING", requestedBy: "mai", effective: "2027-06-01", note: "Mong gia hạn thêm 12 tháng." }],
  joinRequests: [{ id: "join1", contractId: "k2", applicantId: "bao", requestedBy: "mai", status: "PENDING_LANDLORD", date: "2026-10-23", representativeConsent: true, applicantConsent: true }],
  roommateProfile: { location: "Cầu Giấy, Thanh Xuân", budgetMin: 3000000, budgetMax: 5000000, habits: "Không hút thuốc · Giờ giấc ổn định", available: "2026-11-01" },
  roommateProfiles: {
    bao: { location: "Cầu Giấy", budgetMin: 3000000, budgetMax: 5000000, habits: "Không hút thuốc · Muốn cùng tìm phòng", available: "2026-11-01" },
    ngoc: { location: "Thanh Xuân", budgetMin: 2000000, budgetMax: 3500000, habits: "Ưu tiên không hút thuốc · Giữ vệ sinh chung", available: "2026-11-01" },
    mai: { location: "Cầu Giấy", budgetMin: 2000000, budgetMax: 3000000, habits: "Giờ giấc ổn định · Muốn trao đổi trước khi ở chung", available: "2026-11-01" }
  },
  roommateInvites: [{ id: "rm1", senderId: "bao", receiverId: "lan", status: "PENDING", scenario: "SEARCH_TOGETHER", note: "Mình đang tìm phòng khu Cầu Giấy, bạn cùng tìm nhé?" }, { id: "rm2", senderId: "mai", receiverId: "lan", status: "PENDING", scenario: "JOIN_SYSTEM_ROOM", contractId: "k2", note: "Phòng P305 còn một chỗ, bạn muốn ở cùng không?" }],
  invoices: [
    { id: "i1", code: "INV-2026-10-018", contractId: "k2", period: "2026-10-01", due: "2026-10-05", status: "UNPAID", payerId: "mai", items: [{ name: "Tiền phòng", quantity: 1, unit: "tháng", price: 5400000 }, { name: "Điện", quantity: 55, unit: "kWh", price: 3800 }, { name: "Nước", quantity: 4, unit: "m³", price: 28000 }, { name: "Internet", quantity: 1, unit: "phòng", price: 100000 }] },
    { id: "i2", code: "INV-2026-09-018", contractId: "k2", period: "2026-09-01", due: "2026-09-05", status: "PAID", payerId: "mai", items: [{ name: "Tiền phòng", quantity: 1, unit: "tháng", price: 5400000 }, { name: "Điện", quantity: 48, unit: "kWh", price: 3800 }, { name: "Nước", quantity: 4, unit: "m³", price: 28000 }, { name: "Internet", quantity: 1, unit: "phòng", price: 100000 }] },
    { id: "i3", code: "INV-2026-08-072", contractId: "k3", period: "2026-08-01", due: "2026-08-05", status: "PAID", payerId: "lan", items: [{ name: "Tiền phòng", quantity: 1, unit: "tháng", price: 3700000 }, { name: "Điện", quantity: 39, unit: "kWh", price: 3800 }] }
  ],
  verifications: [{ id: "ver1", userId: "huong", type: "Chủ trọ", status: "PENDING", date: "2026-10-22" }, { id: "ver2", userId: "bao", type: "Căn cước người thuê", status: "PENDING", date: "2026-10-23" }],
  reports: [{ id: "rep1", from: "lan", target: "Tin đăng P408", reason: "Hình ảnh cần kiểm tra lại", status: "PENDING", date: "2026-10-23" }],
  templates: [{ id: "tpl1", name: "Hợp đồng thuê phòng", version: 1, content: "Thanh toán trước ngày 05 hằng tháng. Báo trước 30 ngày khi kết thúc.", active: true }, { id: "tpl2", name: "Phụ lục gia hạn", version: 1, content: "Gia hạn thời hạn thuê theo thỏa thuận của hai bên.", active: true }],
  audit: [{ id: "audit1", actorId: "admin", action: "APPROVE_POST", target: "Tin đăng P204", reason: "Đã kiểm tra nội dung và hình ảnh", date: "2026-10-21" }],
  notifications: [{ id: "n1", userId: "lan", text: "Chủ trọ đã gửi hợp đồng HD-2026-041 để bạn xác nhận.", read: false }, { id: "n2", userId: "quan", text: "Có yêu cầu gia hạn hợp đồng HD-2026-018.", read: false }, { id: "n3", userId: "admin", text: "Có 2 hồ sơ đang chờ xác minh.", read: false }],
  reviews: []
};

const storageKey = "troday-wireframe-v5-20261023";
let state;
try { state = JSON.parse(localStorage.getItem(storageKey)) || structuredClone(seed); }
catch { state = structuredClone(seed); }
state.chatDrafts ||= {};
state.chatContexts ||= {};
state.viewingProposals ||= [];
// Update bundled photos in saved demos without resetting the visitor's changes.
for (const item of state.rooms) {
  const oldPhoto = /^(?:\.?\/)?assets\/(r[1-6])\.png$/i.exec(item.photo || "");
  if (oldPhoto) item.photo = PHOTO[oldPhoto[1].toLowerCase()];
}
const $ = (selector) => document.querySelector(selector);
const byId = (items, id) => items.find((item) => item.id === id);
const room = (id) => byId(state.rooms, id);
const house = (id) => byId(state.houses, id);
const contract = (id) => byId(state.contracts, id);
const userId = () => ({ tenant: "lan", landlord: "quan", admin: "admin" })[state.role];
const person = (id) => { const base = PEOPLE[id] || { name: id || "Người dùng", short: id || "Người dùng", initials: "?", color: "" }; return state.nameOverrides?.[id] ? { ...base, name: state.nameOverrides[id] } : base; };
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const icon = (name) => `<i data-lucide="${name}" aria-hidden="true"></i>`;
const money = (amount) => new Intl.NumberFormat("vi-VN").format(Number(amount) || 0) + " đ";
const shortMoney = (amount) => `${(amount / 1000000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} triệu`;
const dateLabel = (value) => value ? new Date(`${value}T12:00:00`).toLocaleDateString("vi-VN") : "—";
const monthLabel = (value) => value ? new Date(`${value}T12:00:00`).toLocaleDateString("vi-VN", { month: "2-digit", year: "numeric" }) : "—";
const avatar = (id) => `<span class="avatar ${person(id).color}">${esc(person(id).initials)}</span>`;
const chip = (label, tone = "gray") => `<span class="pill ${tone}">${esc(label)}</span>`;
const button = (label, action, id = "", style = "", extra = "") => `<button type="button" class="button ${style}" data-action="${action}" data-id="${esc(id)}" ${extra}>${label}</button>`;
const head = (title, subtitle = "", actions = "") => `<div class="page-heading"><div><h1>${title}</h1>${subtitle ? `<p>${subtitle}</p>` : ""}</div><div class="heading-actions">${actions}</div></div>`;
const empty = (title, message) => `<div class="empty-state">${icon("inbox")}<div><strong>${title}</strong><p>${message}</p></div></div>`;
const roomName = (id) => { const r = room(id); return r ? `${r.code} · ${house(r.houseId).name}` : "Phòng trọ"; };
const totalInvoice = (invoice) => invoice.items.reduce((sum, item) => sum + (item.type === "DISCOUNT" ? -1 : 1) * item.quantity * item.price, 0);

function save() { try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch { /* Private browsing may disable local storage. */ } }
function flash(message) { const toast = $("#toast"); toast.textContent = message; toast.classList.add("show"); clearTimeout(flash.timer); flash.timer = setTimeout(() => toast.classList.remove("show"), 2800); }
function closeDialog() { if ($("#app-dialog").open) $("#app-dialog").close(); }
function modal(title, body) {
  $("#dialog-body").innerHTML = `<div class="dialog-header"><h2>${title}</h2><button type="button" class="icon-button" data-action="close-dialog" aria-label="Đóng" title="Đóng">${icon("x")}</button></div><div class="dialog-content">${body}</div>`;
  if (!$("#app-dialog").open) $("#app-dialog").showModal(); refreshIcons();
}
function refreshIcons() { if (window.lucide) window.lucide.createIcons(); }
function changeView(view) { state.view = view; state.tab = "all"; state.selectedRoom = null; state.chatMobileOpen = false; save(); render(); window.scrollTo(0, 0); }
function switchRole(role) { state.role = role; state.view = role === "tenant" ? "discover" : "dashboard"; state.selectedConversation = role === "landlord" ? "c1" : "c1"; state.chatMobileOpen = false; save(); render(); window.scrollTo(0, 0); }

function renderShell() {
  const roleLabel = { tenant: "Không gian người thuê", landlord: "Không gian chủ trọ", admin: "Không gian quản trị" }[state.role];
  $("#sidebar-role").innerHTML = `<div class="sidebar-role">${roleLabel}</div>`;
  const navigation = NAV[state.role];
  $("#sidebar-nav").innerHTML = navigation.map(([id, label, glyph], index) => `${index === 0 ? `<div class="nav-group-title">Điều hướng</div>` : ""}<button type="button" class="nav-link ${state.view === id || (state.view === "detail" && id === "discover") ? "active" : ""}" data-action="navigate" data-id="${id}">${icon(glyph)}<span>${label}</span></button>`).join("");
  $("#mobile-nav").innerHTML = navigation.map(([id, label, glyph]) => `<button type="button" class="nav-link ${state.view === id || (state.view === "detail" && id === "discover") ? "active" : ""}" data-action="navigate" data-id="${id}">${icon(glyph)}<span>${label}</span></button>`).join("");
  const me = userId();
  $("#sidebar-account").innerHTML = `<div class="account-row">${avatar(me)}<div class="account-copy"><strong>${esc(person(me).name)}</strong><small>${roleLabel}</small></div></div>`;
  $("#topbar-role-switch").innerHTML = [["tenant", "Người thuê", "Thuê"], ["landlord", "Chủ trọ", "Chủ"], ["admin", "Quản trị", "QT"]].map(([role, label, short]) => `<button type="button" class="${state.role === role ? "active" : ""}" data-action="switch-role" data-id="${role}" data-short="${short}">${label}</button>`).join("");
  const currentNav = navigation.find(([id]) => id === state.view);
  $("#topbar-title").textContent = state.view === "detail" ? "Chi tiết phòng" : currentNav ? currentNav[1] : "Trọday";
  $("#notification-dot").style.display = state.notifications.some((item) => item.userId === me && !item.read) ? "block" : "none";
}

function render() {
  state.contracts.forEach((c) => ensureRepresentativeHistory(c));
  expireJoinHolds();
  expireViewingProposals();
  state.rooms.forEach((r) => syncRoomStatus(r.id));
  renderShell();
  const view = state.view;
  const renderer = {
    discover: renderDiscover, detail: renderDetail, favorites: renderFavorites,
    dashboard: renderDashboard, properties: renderProperties, services: renderServices,
    listings: renderListings, chats: renderChats, viewings: renderViewings,
    contracts: renderContracts, residents: renderResidents, invoices: renderInvoices,
    roommates: renderRoommates, verifications: renderVerifications,
    moderation: renderModeration, templates: renderTemplates, reports: renderReports, users: renderUsers, audit: renderAudit,
    profile: renderProfile
  }[view] || renderDiscover;
  const main = $("#app-main");
  main.classList.toggle("chat-view", view === "chats");
  main.innerHTML = renderer();
  refreshIcons();
  if (view === "chats") { syncChatComposer(); const pane = $(".chat-pane-body"); if (pane) pane.scrollTop = pane.scrollHeight; }
}

function roomCard(r) {
  const h = house(r.houseId);
  const saved = state.favorites.includes(r.id);
  return `<article class="property-card"><div class="property-media"><img src="${esc(r.photo)}" alt="${esc(r.title)}" loading="lazy">${chip(r.status === "AVAILABLE" ? "Còn phòng" : "Sắp có phòng", r.status === "AVAILABLE" ? "green" : "yellow")}</div><div class="property-body"><h2 class="property-title">${esc(r.title)}</h2><div class="property-location">${icon("map-pin")}<span>${esc(h.area)} · ${esc(h.address)}</span></div><div class="property-meta"><span>${r.area} m²</span><span>•</span><span>Tối đa ${r.capacity} người</span><span>•</span><span>${r.distance} km</span></div><div class="property-foot"><div class="price">${shortMoney(r.price)}<small>/tháng</small></div><div class="property-buttons"><button type="button" class="icon-button" data-action="favorite" data-id="${r.id}" aria-label="${saved ? "Bỏ lưu" : "Lưu tin"}" title="${saved ? "Bỏ lưu" : "Lưu tin"}">${icon(saved ? "heart-handshake" : "heart")}</button>${button("Xem phòng", "room-detail", r.id, "small")}</div></div></div></article>`;
}

function renderDiscover() {
  const f = state.filters;
  const visible = state.rooms.filter((r) => {
    if (r.postStatus !== "APPROVED" || r.status === "OCCUPIED") return false;
    const h = house(r.houseId);
    const text = `${r.title} ${r.code} ${h.name} ${h.area} ${h.address}`.toLocaleLowerCase("vi-VN");
    return (!f.query || text.includes(f.query.toLocaleLowerCase("vi-VN"))) &&
      (f.area === "all" || h.area === f.area) && (!f.maxPrice || r.price <= Number(f.maxPrice)) &&
      (!f.minArea || r.area >= Number(f.minArea)) && (!f.amenity || r.amenities.includes(f.amenity)) &&
      (!f.distance || r.distance <= Number(f.distance));
  });
  return head("Khám phá phòng trọ", `${visible.length} phòng phù hợp`, button(`${icon("heart")} Đã lưu`, "navigate", "favorites")) +
    `<form class="filter-bar" data-form="filters"><label class="field wide">Khu vực hoặc tên phòng<input name="query" value="${esc(f.query)}" placeholder="Tìm địa điểm, mã phòng..."></label><label class="field">Khu vực<select name="area"><option value="all">Tất cả</option>${["Cầu Giấy", "Thanh Xuân"].map((x) => `<option value="${x}" ${f.area === x ? "selected" : ""}>${x}</option>`).join("")}</select></label><label class="field narrow">Giá tối đa<select name="maxPrice">${[["", "Bất kỳ"], ["3500000", "3,5 triệu"], ["4000000", "4 triệu"], ["5000000", "5 triệu"]].map(([v, label]) => `<option value="${v}" ${f.maxPrice === v ? "selected" : ""}>${label}</option>`).join("")}</select></label><label class="field narrow">Diện tích từ<input name="minArea" type="number" min="0" value="${esc(f.minArea)}" placeholder="m²"></label><label class="field">Tiện ích<select name="amenity"><option value="">Tất cả</option>${["Điều hòa", "Wi-Fi", "Ban công", "Thang máy", "Máy giặt"].map((x) => `<option value="${x}" ${f.amenity === x ? "selected" : ""}>${x}</option>`).join("")}</select></label><label class="field narrow">Trong bán kính<select name="distance"><option value="">Bất kỳ</option>${[1, 2, 3, 5].map((x) => `<option value="${x}" ${f.distance === String(x) ? "selected" : ""}>${x} km</option>`).join("")}</select></label><button class="button primary" type="submit">${icon("search")} Lọc</button>${button(icon("rotate-ccw"), "clear-filters", "", "compact", 'title="Xóa bộ lọc" aria-label="Xóa bộ lọc"')}</form>` +
    (visible.length ? `<div class="property-grid">${visible.map(roomCard).join("")}</div>` : empty("Không tìm thấy phòng", "Hãy thử điều chỉnh khu vực hoặc mức giá."));
}

function renderFavorites() {
  const saved = state.rooms.filter((r) => state.favorites.includes(r.id));
  return head("Tin đã lưu", `${saved.length} phòng bạn đang theo dõi`) + (saved.length ? `<div class="property-grid">${saved.map(roomCard).join("")}</div>` : empty("Chưa lưu phòng nào", "Lưu phòng quan tâm để xem lại ở đây."));
}

function renderDetail() {
  const r = room(state.selectedRoom) || state.rooms[0];
  const h = house(r.houseId);
  const owner = person(h.ownerId);
  const saved = state.favorites.includes(r.id);
  const services = state.roomServices.filter((item) => item.roomId === r.id && item.active).map((item) => {
    const service = byId(state.services, item.serviceId);
    return service && service.active ? `${service.name}: ${money(item.override ?? service.price)}/${service.unit}` : "";
  }).filter(Boolean);
  const backView = state.role === "admin" ? "moderation" : state.role === "landlord" ? "listings" : "discover";
  const returnChat = visibleConversations().find((c) => c.id === state.sharedPostReturn && c.type === "ROOMMATE");
  return head(r.title, `${r.code} · ${h.address}`, `${returnChat ? button(`${icon("arrow-left")} Quay lại tin nhắn`, "return-shared-chat", returnChat.id) : button(`${icon("arrow-left")} Danh sách`, "navigate", backView)}${state.role === "tenant" ? button(`${icon("heart")} ${saved ? "Bỏ lưu" : "Lưu tin"}`, "favorite", r.id) : ""}`) +
    `<div class="detail-layout"><div><img class="detail-image" src="${esc(r.photo)}" alt="${esc(r.title)}"><div class="detail-info"><div><span class="muted tiny">Diện tích</span><strong>${r.area} m²</strong></div><div><span class="muted tiny">Sức chứa</span><strong>${r.capacity} người</strong></div><div><span class="muted tiny">Khoảng cách</span><strong>${r.distance} km</strong></div></div><div class="section-bar"><h2>Về phòng này</h2></div><p class="muted" style="font-size:13px;line-height:1.6">${esc(r.description)}</p><div class="section-bar"><h2>Tiện ích</h2></div><div class="amenity-list">${r.amenities.map((x) => `<span>${esc(x)}</span>`).join("")}</div><div class="section-bar"><h2>Dịch vụ áp dụng</h2></div><div class="stack tight">${services.length ? services.map((x) => `<div class="list-row"><strong>${esc(x)}</strong></div>`).join("") : `<span class="muted tiny">Chủ trọ chưa cập nhật dịch vụ.</span>`}</div></div><aside class="detail-sidebar"><div class="price">${shortMoney(r.price)} <small>/tháng</small></div><p class="muted tiny">Cọc ${money(r.deposit)} · ${chip(r.status === "AVAILABLE" ? "Còn phòng" : "Đã giữ chỗ", r.status === "AVAILABLE" ? "green" : "yellow")}</p><div class="list-row"><div>${avatar(h.ownerId)}</div><div style="flex:1"><strong>${esc(owner.name)}</strong><small>Chủ trọ · ${esc(h.name)}</small></div></div>${state.role === "tenant" ? `<div class="stack" style="margin-top:16px">${button(`${icon("message-circle")} Nhắn tin về phòng này`, "chat-room", r.id, "primary")}${r.postStatus === "APPROVED" ? button(`${icon("calendar-plus")} Đề nghị lịch xem`, "open-viewing-request", r.id, "", r.status !== "AVAILABLE" || hasLiveRoomContract(r.id) || roomLoad(r.id) ? 'disabled title="Phòng hiện chưa thể hẹn xem"' : "") : ""}${r.postStatus === "APPROVED" ? button(`${icon("share-2")} Chia sẻ cho bạn ghép`, "share-post", r.id) : ""}${button(`${icon("flag")} Báo cáo tin`, "report-post", r.id)}</div>` : ""}</aside></div>`;
}

function visibleConversations() { return state.conversations.filter((c) => c.users.includes(userId())); }
function otherUser(conversation) { return conversation.users.find((id) => id !== userId()); }
function chatPeerTag(conversation) {
  if (conversation.type === "ROOMMATE") return chip("Bạn ghép", "green");
  return state.houses.some((h) => h.ownerId === otherUser(conversation)) ? chip("Chủ trọ", "yellow") : chip("Người thuê", "gray");
}
function acceptedRoommateInvite(invite) {
  return state.role === "tenant" && invite?.status === "ACCEPTED" && !invite.endedAt && invite.senderId !== invite.receiverId && [invite.senderId, invite.receiverId].includes(userId());
}
function shareablePost(id) { const r = room(id); return r?.postStatus === "APPROVED" ? r : null; }
function sharedPostPreview(message) {
  return message?.messageType === "POST_SHARE" ? `Đã chia sẻ: ${shareablePost(message.sharedPostId)?.title || "Tin phòng không còn hiển thị"}` : message?.text || "Bắt đầu cuộc trò chuyện";
}
function sharedPostCard(message) {
  const r = shareablePost(message.sharedPostId);
  if (!r) return '<div class="shared-post-unavailable">Tin phòng không còn hiển thị.</div>';
  const status = { AVAILABLE: "Còn phòng", RESERVED: "Đã giữ chỗ", OCCUPIED: "Đã có người ở", MAINTENANCE: "Đang bảo trì" };
  return `<div class="shared-post-card"><img src="${esc(r.photo)}" alt=""><div class="shared-post-info"><strong>${esc(r.code)} · ${esc(r.title)}</strong><span>${shortMoney(r.price)}/tháng · ${r.area} m²</span><span>${esc(house(r.houseId).area)}</span>${chip(status[r.status] || "Chưa rõ tình trạng", r.status === "AVAILABLE" ? "green" : "gray")}${button("Xem phòng", "shared-post-detail", message.id, "small")}</div></div>`;
}
function openSharePost(id = "") {
  if (state.role !== "tenant") return;
  const invites = state.roommateInvites.filter(acceptedRoommateInvite);
  const posts = state.rooms.filter((r) => r.postStatus === "APPROVED" && (!id || r.id === id));
  if (!invites.length) { flash("Bạn cần có kết nối đã chấp nhận để chia sẻ tin phòng."); return; }
  if (!posts.length) { flash("Không có tin phòng đang hiển thị để chia sẻ."); return; }
  const current = byId(state.conversations, state.selectedConversation);
  modal("Chia sẻ tin phòng", `<form data-form="share-post"><div class="form-grid"><label class="field full">Gửi cho bạn ghép<select name="inviteId" required>${invites.map((invite) => { const peer = invite.senderId === userId() ? invite.receiverId : invite.senderId; return `<option value="${esc(invite.id)}" ${current?.type === "ROOMMATE" && current.roommateRequestId === invite.id ? "selected" : ""}>${esc(person(peer).name)}</option>`; }).join("")}</select></label><label class="field full">Tin phòng<select name="postId" required>${posts.map((r) => `<option value="${esc(r.id)}">${esc(r.code)} · ${esc(r.title)} · ${shortMoney(r.price)}/tháng</option>`).join("")}</select></label><label class="field full">Lời nhắn kèm theo<textarea name="note" maxlength="2000" placeholder="Bạn thấy phòng này thế nào?"></textarea></label></div><p class="muted tiny">Chia sẻ để cùng xem và trao đổi, chưa giữ chỗ hoặc xác nhận thuê chung.</p><div class="form-actions">${button("Hủy", "close-dialog")}<button type="submit" class="button primary">Chia sẻ phòng</button></div></form>`);
}
function chatRoomChoices(conversation) {
  if (conversation.type === "ROOMMATE") return [];
  const fromMessages = conversation.messages.map((m) => m.roomId).filter(Boolean);
  const selected = state.chatContext;
  const current = selected && room(selected) && conversation.users.includes(house(room(selected).houseId).ownerId) ? [selected] : [];
  return [...new Set([...fromMessages, ...(conversation.roomIds || []), ...current])].filter((id) => {
    const item = room(id);
    return item && conversation.users.includes(house(item.houseId).ownerId);
  });
}

function chatDraftKey(conversationId = state.selectedConversation) { return `${userId()}:${conversationId}`; }

function selectChatContext(id) {
  const current = visibleConversations().find((c) => c.id === state.selectedConversation);
  if (!current) return;
  const choices = chatRoomChoices(current);
  if (id && !choices.includes(id)) return;
  current.roomIds = choices;
  state.chatContext = id || null;
  state.chatContexts[chatDraftKey(current.id)] = state.chatContext;
  save(); render();
}

function syncChatComposer() {
  const input = $("#chat-message");
  if (!input) return;
  input.style.height = "auto";
  input.style.height = `${Math.min(input.scrollHeight + 2, 120)}px`;
  input.form.querySelector("button[type=submit]").disabled = !input.value.trim();
}

function chatViewingCards(conversation) {
  if (conversation.type === "ROOMMATE" || conversation.users.length !== 2 || !conversation.users.includes(userId())) return "";
  const viewings = state.viewings.filter((v) => v.conversationId === conversation.id && v.ownerId !== v.tenantId && conversation.users.includes(v.ownerId) && conversation.users.includes(v.tenantId) && room(v.roomId));
  if (!viewings.length) return "";
  return `<section class="chat-viewings" aria-label="Lịch xem trong hội thoại"><h3>Lịch xem phòng</h3>${viewings.sort((a, b) => viewingStart(a) - viewingStart(b)).map((v) => {
    const r = room(v.roomId);
    return `<article class="chat-viewing-card" data-viewing-id="${esc(v.id)}"><div class="chat-viewing-heading"><strong>${icon("calendar-days")} Lịch xem ${esc(r.code)}</strong>${chip(...(VIEWING_LABEL[v.status] || ["Chưa rõ trạng thái", "gray"]))}</div><p class="chat-viewing-time">${dateLabel(todayISO(viewingStart(v)))} · ${viewingTimeLabel(v)} <span>(UTC+7)</span></p><p class="muted tiny">${esc(house(r.houseId).name)} · ${esc(house(r.houseId).address)}</p>${v.notes ? `<p class="chat-viewing-note">Ghi chú: ${esc(v.notes)}</p>` : ""}${v.cancellationReason ? `<p class="chat-viewing-note">Lý do hủy: ${esc(v.cancellationReason)}</p>` : ""}${v.status === "COMPLETED" ? `<div class="chat-viewing-decision">${chip(...(DECISION_LABEL[v.decision] || ["Chờ quyết định", "gray"]))}</div>` : ""}<div class="chat-viewing-actions">${button("Xem phòng", "room-detail", v.roomId, "small")}${viewingActions(v)}</div></article>`;
  }).join("")}</section>`;
}

function renderChats() {
  const conversations = visibleConversations();
  const current = conversations.find((c) => c.id === state.selectedConversation) || conversations[0];
  if (!current) return head("Tin nhắn") + empty("Chưa có hội thoại", "Hãy mở một bài đăng và nhắn tin cho chủ trọ.");
  state.selectedConversation = current.id;
  if (Object.hasOwn(state.chatContexts, chatDraftKey(current.id))) state.chatContext = state.chatContexts[chatDraftKey(current.id)];
  const peer = otherUser(current);
  const isRoommate = current.type === "ROOMMATE";
  const me = userId();
  let previousRoom = null;
  const messages = current.messages.map((m) => {
    const r = room(m.roomId);
    const context = r && previousRoom !== m.roomId ? `<button type="button" class="context-event" data-action="room-detail" data-id="${r.id}"><img src="${esc(r.photo)}" alt=""><span><strong>${esc(r.code)} · ${esc(r.title)}</strong><small>${shortMoney(r.price)}/tháng · ${esc(house(r.houseId).area)}</small></span></button>` : "";
    previousRoom = m.roomId;
    return `${context}<div class="message-row ${m.senderId === me ? "mine" : ""}"><div class="message-bubble">${m.text ? `<span class="message-text">${esc(m.text)}</span>` : ""}${m.messageType === "POST_SHARE" ? sharedPostCard(m) : ""}<small>${esc(m.time)}</small></div></div>`;
  }).join("");
  const choices = chatRoomChoices(current);
  const activeRoom = choices.includes(state.chatContext) ? room(state.chatContext) : null;
  const draft = state.chatDrafts[chatDraftKey(current.id)] || "";
  return head("Tin nhắn", "Trao đổi với chủ trọ và những người đã kết nối") +
    `<div class="chat-shell ${state.chatMobileOpen ? "thread-open" : ""}">
      <section class="chat-contacts">
        <div class="chat-contact-head"><h2>Hội thoại</h2>${chip(String(conversations.length), "green")}</div>
        <input class="search-input chat-search" id="chat-search" placeholder="Tìm người đang chat" aria-label="Tìm người đang chat">
        <div class="contact-list">${conversations.map((c) => {
          const p = otherUser(c);
          const last = c.messages[c.messages.length - 1];
          return `<button type="button" class="contact ${c.id === current.id ? "active" : ""}" data-action="select-chat" data-id="${c.id}">${avatar(p)}<span class="contact-copy"><span class="chat-person-name"><strong>${esc(person(p).name)}</strong>${chatPeerTag(c)}</span><small>${esc(sharedPostPreview(last))}</small></span></button>`;
        }).join("")}</div>
      </section>
      <section class="chat-pane" aria-label="Hội thoại với ${esc(person(peer).name)}">
        <div class="chat-pane-head">
          <button type="button" class="icon-button mobile-back" data-action="back-chats" aria-label="Danh sách hội thoại">${icon("arrow-left")}</button>
          ${avatar(peer)}<div class="head-copy"><div class="chat-person-name"><h2>${esc(person(peer).name)}</h2>${chatPeerTag(current)}</div><small>${isRoommate ? "Đã kết nối · Trao đổi ở ghép" : `${choices.length} phòng đã trao đổi`}</small></div>
          ${isRoommate ? button("Xem hồ sơ", "roommate-profile", peer, "small") : state.role === "landlord" ? button(`${icon("calendar-plus")} Hẹn xem`, "open-appointment", "", "small") : button("Đề nghị lịch xem", "open-viewing-request", "", "small")}
        </div>
        <div class="chat-pane-body" role="log" aria-label="Nội dung hội thoại">${isRoommate ? '<p class="connection-note">Hai bạn đã kết nối để trao đổi. Việc thuê chung cần được thỏa thuận và xác nhận riêng.</p>' : '<div class="message-date">Hội thoại gần đây</div>'}${messages || (isRoommate ? '<p class="muted tiny">Gửi lời chào để bắt đầu cuộc trò chuyện.</p>' : "")}${renderViewingProposals(current)}${chatViewingCards(current)}</div>
        <form class="chat-composer" data-form="chat-message" aria-label="Soạn tin nhắn">
          ${isRoommate ? `<div class="chat-share-toolbar">${button(`${icon("share-2")} Chia sẻ phòng`, "share-post", "", "small")}</div>` : ""}
          ${!isRoommate ? `<div class="chat-room-picker">
            <label for="chat-room-context">Trao đổi về</label>
            <select id="chat-room-context" data-change="chat-context" aria-label="Chọn phòng trao đổi" ${choices.length ? "" : "disabled"}>
              <option value="" ${activeRoom ? "" : "selected"}>Trao đổi chung</option>
              ${choices.map((id) => { const r = room(id); return `<option value="${esc(id)}" ${activeRoom?.id === id ? "selected" : ""}>${esc(r.code)} · ${esc(r.title)}</option>`; }).join("")}
            </select>
          </div>` : ""}
          ${activeRoom ? `<div class="composer-context"><span>Đang hỏi về <strong>${esc(activeRoom.code)} · ${esc(activeRoom.title)}</strong></span><button type="button" class="inline-action" data-action="clear-context">Bỏ chọn</button></div>` : ""}
          <div class="chat-compose-row">
            <textarea id="chat-message" name="message" rows="1" maxlength="2000" required placeholder="Nhập tin nhắn..." aria-label="Nội dung tin nhắn" aria-describedby="chat-composer-help">${esc(draft)}</textarea>
            <button type="submit" class="button primary chat-send" aria-label="Gửi tin nhắn" ${draft.trim() ? "" : "disabled"}>${icon("send")}<span>Gửi</span></button>
          </div>
          <p class="composer-help" id="chat-composer-help">Enter để gửi · Shift + Enter để xuống dòng</p>
        </form>
      </section>
      <aside class="chat-context">
        <div class="chat-context-head"><h2>${isRoommate ? "Người đã kết nối" : "Phòng đã trao đổi"}</h2></div>
        <div class="chat-context-list">${isRoommate ? `<strong>${esc(person(peer).name)}</strong>${roommateProfileSummary(peer)}${button("Xem hồ sơ", "roommate-profile", peer, "small")}` : choices.map((id) => {
          const r = room(id);
          return `<button type="button" class="context-choice ${state.chatContext === id ? "active" : ""}" data-action="select-context" data-id="${id}"><img src="${esc(r.photo)}" alt=""><span><strong>${esc(r.code)} · ${esc(r.title)}</strong><small>${shortMoney(r.price)}/tháng</small></span></button>`;
        }).join("")}</div>
      </aside>
    </div>`;
}

const VIEWING_LABEL = { SCHEDULED: ["Đã hẹn", "yellow"], COMPLETED: ["Đã đến xem", "green"], CANCELLED: ["Đã hủy", "gray"], NO_SHOW: ["Không đến", "red"] };
const DECISION_LABEL = { WAITING: ["Chờ quyết định", "gray"], AGREED: ["Đồng ý thuê", "green"], DECLINED: ["Không thuê", "gray"], WITHDRAWN: ["Đã rút ý định thuê", "gray"] };
function viewingActions(v) {
  if (v.status === "SCHEDULED") {
    const ownerActions = state.role === "landlord" ? `${button("Xác nhận đến xem", "confirm-attendance", v.id, "small primary")}${button("Không đến", "no-show", v.id, "small")}` : "";
    return ownerActions + button("Hủy lịch", "cancel-viewing", v.id, "small");
  }
  if (v.status !== "COMPLETED") return "";
  const linked = liveViewingContract(v.id);
  if (state.role === "landlord" && v.decision === "AGREED") return linked ? button("Xem hợp đồng", "contract-detail", linked.id, "small") : button("Tạo hợp đồng", "open-contract", v.id, "small primary");
  if (state.role === "tenant" && v.decision === "WAITING") return `${button("Đồng ý thuê", "agree-rent", v.id, "small primary")}${button("Từ chối", "decline-rent", v.id, "small")}`;
  if (state.role === "tenant" && v.decision === "AGREED") return button("Rút ý định thuê", "withdraw-rent", v.id, "small", linked ? 'disabled title="Cần chủ trọ hủy hoặc kết thúc hợp đồng liên quan trước"' : "");
  return "";
}
function renderViewings() {
  const my = state.viewings.filter((v) => state.role === "tenant" ? v.tenantId === userId() : v.ownerId === userId());
  const tabs = [["all", "Tất cả"], ["SCHEDULED", "Lịch đã hẹn"], ["COMPLETED", "Đã xem"], ["CANCELLED", "Đã hủy"], ["NO_SHOW", "Không đến"]];
  const visible = my.filter((v) => state.tab === "all" || v.status === state.tab);
  return head("Lịch xem phòng", `${my.length} lịch hẹn`, state.role === "landlord" ? button(`${icon("calendar-plus")} Tạo lịch hẹn`, "open-appointment", "", "primary") : button("Đề nghị lịch xem", "open-viewing-request", "", "primary")) +
    renderViewingProposals() + `<p class="muted tiny">Thời gian hiển thị theo giờ Việt Nam (UTC+7).</p><div class="tabs">${tabs.map(([id, label]) => `<button type="button" class="tab-button ${state.tab === id ? "active" : ""}" data-action="tab" data-id="${id}">${label}</button>`).join("")}</div><div class="table-surface table-scroll">${visible.length ? `<table><thead><tr><th>Phòng</th><th>Người thuê</th><th>Thời gian</th><th>Lịch xem</th><th>Quyết định</th><th></th></tr></thead><tbody>${visible.map((v) => { const r = room(v.roomId); return `<tr><td><div class="room-row"><img src="${esc(r.photo)}" alt=""><div><span class="cell-title">${esc(r.code)}</span><span class="cell-sub">${esc(house(r.houseId).name)}</span></div></div></td><td>${esc(person(v.tenantId).name)}</td><td>${dateLabel(v.date)}<span class="cell-sub">${viewingTimeLabel(v)}</span>${v.cancellationReason ? `<span class="cell-sub">${esc(v.cancellationReason)}</span>` : ""}</td><td>${chip(...VIEWING_LABEL[v.status])}</td><td>${chip(...DECISION_LABEL[v.decision])}</td><td class="actions-cell"><div class="table-actions">${viewingActions(v)}</div></td></tr>`; }).join("")}</tbody></table>` : empty("Không có lịch hẹn", "Các lịch xem phòng sẽ xuất hiện ở đây.")}</div>`;
}

const CONTRACT_LABEL = { DRAFT: ["Bản nháp", "gray"], PENDING_CONFIRMATION: ["Chờ xác nhận", "yellow"], CONFIRMED: ["Đã xác nhận", "purple"], ACTIVE: ["Đang ở", "green"], TERMINATED: ["Đã kết thúc", "gray"], EXPIRED: ["Hết hạn", "gray"], CANCELLED: ["Đã hủy", "red"] };
const CHANGE_LABEL = { PENDING: ["Chờ chủ trọ", "yellow"], APPROVED_WAITING_CONFIRMATION: ["Chờ đại diện xác nhận", "yellow"], READY_TO_APPLY: ["Chờ áp dụng", "yellow"], COMPLETED: ["Đã áp dụng", "green"], REJECTED: ["Từ chối", "gray"], CANCELLED: ["Đã hủy", "gray"], EXPIRED: ["Hết hạn", "gray"] };
function renderContracts() {
  const contracts = state.contracts.filter((c) => state.role === "tenant" ? c.members.some((m) => m.tenantId === userId()) : c.ownerId === "quan");
  const selected = contracts.find((c) => c.id === state.selectedContract) || contracts[0];
  if (!selected) return head("Hợp đồng") + empty("Chưa có hợp đồng", "Sau khi đồng ý thuê, chủ trọ sẽ lập hợp đồng cho bạn.");
  state.selectedContract = selected.id;
  const r = room(selected.roomId);
  const changes = state.changeRequests.filter((x) => x.contractId === selected.id);
  const tenantActions = selected.status === "PENDING_CONFIRMATION" && selected.tenantId === userId() ? `${button("Yêu cầu sửa", "open-feedback", selected.id)}${button(`${icon("check")} Xác nhận nội dung`, "confirm-contract", selected.id, "primary")}` : selected.status === "ACTIVE" && selected.tenantId === userId() ? button(`${icon("repeat-2")} Đề nghị thay đổi`, "open-change", selected.id) : selected.status === "TERMINATED" ? button(`${icon("star")} Đánh giá phòng`, "open-review", selected.id) : "";
  const ownerActions = (selected.status === "DRAFT" ? button("Chỉnh và gửi lại", "open-resend", selected.id, "primary") : ["CONFIRMED", "ACTIVE"].includes(selected.status) && selected.members.some((m) => m.status === "PLANNED") ? button(`${icon("key-round")} Xác nhận thành viên vào ở`, "confirm-move-in", selected.id, "primary") : "") + (["DRAFT", "PENDING_CONFIRMATION", "CONFIRMED"].includes(selected.status) ? button("Hủy hợp đồng", "cancel-contract", selected.id, "danger") : "");
  return head("Hợp đồng", `${contracts.length} hợp đồng liên quan`, button("Lịch sử đại diện", "representative-history", selected.id)) +
    `<div class="split-grid"><div><div class="table-surface table-scroll"><table><thead><tr><th>Số hợp đồng</th><th>Phòng</th><th>Thời hạn</th><th>Trạng thái</th><th></th></tr></thead><tbody>${contracts.map((c) => `<tr><td><span class="cell-title">${esc(c.number)}</span><span class="cell-sub">${esc(person(c.tenantId).name)}</span></td><td>${esc(room(c.roomId).code)}</td><td>${dateLabel(c.start)} - ${dateLabel(c.end)}</td><td>${chip(...CONTRACT_LABEL[c.status])}</td><td class="actions-cell">${button("Chi tiết", "contract-detail", c.id, "small")}</td></tr>`).join("")}</tbody></table></div>${state.role === "landlord" && state.changeRequests.length ? `<div class="section-bar"><h2>Yêu cầu điều chỉnh</h2></div><div class="flat-surface"><div style="padding:0 15px">${state.changeRequests.filter((x) => x.status === "PENDING").map((x) => `<div class="list-row"><div><strong>${esc(x.type === "RENEWAL" ? "Gia hạn" : x.type === "TRANSFER" ? "Đổi phòng" : "Kết thúc")} · ${esc(contract(x.contractId)?.number || "")}</strong><small>${esc(x.note)} · ${esc(person(x.requestedBy).name)}</small></div>${button("Xử lý", "review-change", x.id, "small")}</div>`).join("") || `<div class="list-row"><span class="muted tiny">Không có yêu cầu mới.</span></div>`}</div></div>` : ""}</div><aside><div class="subtle-panel"><div class="room-row"><img src="${esc(r.photo)}" alt=""><div><h3>${esc(r.code)} · ${esc(r.title)}</h3><span class="muted tiny">${esc(house(r.houseId).name)}</span></div></div><div class="list-row"><div><strong>${esc(selected.number)}</strong><small>Phiên bản ${selected.revisionNo} · ${selected.source === "PAPER_IMPORT" ? "Hồ sơ giấy" : "Thuê mới"}</small></div>${chip(...CONTRACT_LABEL[selected.status])}</div><div class="list-row"><div><strong>Đại diện</strong><small>${esc(person(selected.tenantId).name)}</small></div></div><div class="list-row"><div><strong>Thời hạn</strong><small>${dateLabel(selected.start)} - ${dateLabel(selected.end)}</small></div></div><div class="list-row"><div><strong>Giá thuê / cọc</strong><small>${money(selected.rent)} / ${money(selected.deposit)}</small></div></div><div class="list-row"><div><strong>Thành viên</strong><small>${selected.members.map((m) => esc(m.name)).join(", ")}</small></div></div><div class="list-row"><div><strong>Điều khoản</strong><small>${esc(selected.terms)}</small></div></div>${selected.feedback ? `<div class="list-row"><div><strong>Góp ý gần nhất</strong><small>${esc(selected.feedback)}</small></div></div>` : ""}<div class="stack" style="margin-top:15px">${state.role === "tenant" ? tenantActions : ownerActions}</div></div>${changes.length ? `<div class="section-bar"><h2>Lịch sử thay đổi</h2></div>${changes.map((x) => `<div class="list-row"><div><strong>${esc(x.type)} · ${dateLabel(x.effective)}</strong><small>${esc(x.note)}</small></div><div class="table-actions">${chip(...(CHANGE_LABEL[x.status] || [x.status, "gray"]))}${state.role === "tenant" && x.status === "APPROVED_WAITING_CONFIRMATION" ? button("Đồng ý phương án", "accept-change", x.id, "small primary") : ""}${state.role === "landlord" && x.status === "READY_TO_APPLY" ? button("Áp dụng", "apply-change", x.id, "small primary") : ""}</div></div>`).join("")}` : ""}</aside></div>`;
}

function renderDashboard() {
  if (state.role === "admin") {
    const pending = state.verifications.filter((x) => x.status === "PENDING").length;
    const posts = state.rooms.filter((x) => x.postStatus === "PENDING_REVIEW").length;
    const reports = state.reports.filter((x) => x.status === "PENDING").length;
    return head("Tổng quan quản trị", "Hàng đợi cần xử lý") + `<div class="kpi-grid">${[["Hồ sơ chờ xác minh", pending, "badge-check"], ["Tin chờ duyệt", posts, "panel-top"], ["Báo cáo mới", reports, "flag"], ["Người dùng", Object.keys(PEOPLE).length, "users"]].map(([name, value, glyph]) => `<div class="kpi"><span class="kpi-label">${icon(glyph)} ${name}</span><div class="kpi-value">${value}</div></div>`).join("")}</div><div class="section-bar"><h2>Việc cần xử lý</h2></div><div class="flat-surface" style="padding:0 16px"><div class="list-row"><div><strong>Xác minh danh tính</strong><small>${pending} hồ sơ đang chờ</small></div>${button("Mở hàng đợi", "navigate", "verifications", "small")}</div><div class="list-row"><div><strong>Kiểm duyệt tin đăng</strong><small>${posts} tin chờ duyệt</small></div>${button("Xem tin", "navigate", "moderation", "small")}</div><div class="list-row"><div><strong>Báo cáo vi phạm</strong><small>${reports} báo cáo mới</small></div>${button("Xử lý", "navigate", "reports", "small")}</div></div>`;
  }
  const ownRooms = state.rooms.filter((r) => house(r.houseId).ownerId === "quan");
  const scheduled = state.viewings.filter((v) => v.ownerId === "quan" && v.status === "SCHEDULED" && viewingEnd(v) > Date.now()).sort((a, b) => viewingStart(a) - viewingStart(b));
  const occupied = ownRooms.filter((r) => r.status === "OCCUPIED");
  const unpaid = state.invoices.filter((i) => contract(i.contractId)?.ownerId === "quan" && i.status === "UNPAID");
  return head("Tổng quan nhà trọ", "Hoạt động trong hệ thống hôm nay", button(`${icon("plus")} Tạo lịch xem`, "open-appointment", "", "primary")) +
    `<div class="kpi-grid"><div class="kpi"><span class="kpi-label">Tổng số phòng</span><div class="kpi-value">${ownRooms.length}</div><div class="kpi-foot">${state.houses.filter((h) => h.ownerId === "quan").length} nhà trọ</div></div><div class="kpi"><span class="kpi-label">Đang có người ở</span><div class="kpi-value">${occupied.length}</div><div class="kpi-foot">${ownRooms.length - occupied.length} phòng chưa có người ở</div></div><div class="kpi"><span class="kpi-label">Lịch xem sắp tới</span><div class="kpi-value">${scheduled.length}</div><div class="kpi-foot">Cần xác nhận người đến xem</div></div><div class="kpi"><span class="kpi-label">Hóa đơn chưa thu</span><div class="kpi-value">${unpaid.length}</div><div class="kpi-foot">${shortMoney(unpaid.reduce((sum, i) => sum + totalInvoice(i), 0))}</div></div></div><div class="split-grid"><div><div class="section-bar"><h2>Lịch xem gần nhất</h2>${button("Xem tất cả", "navigate", "viewings", "small")}</div><div class="flat-surface" style="padding:0 15px">${scheduled.length ? scheduled.map((v) => `<div class="list-row"><div><strong>${esc(roomName(v.roomId))}</strong><small>${esc(person(v.tenantId).name)} · ${dateLabel(v.date)} ${v.time}</small></div>${chip("Đã hẹn", "yellow")}</div>`).join("") : empty("Chưa có lịch sắp tới", "")}</div></div><div><div class="section-bar"><h2>Cần xử lý</h2></div><div class="subtle-panel"><div class="list-row"><div><strong>Hợp đồng chờ xác nhận</strong><small>${state.contracts.filter((c) => c.ownerId === "quan" && c.status === "PENDING_CONFIRMATION").length} hợp đồng</small></div>${button("Mở", "navigate", "contracts", "small")}</div><div class="list-row"><div><strong>Yêu cầu người ở ghép</strong><small>${state.joinRequests.filter((x) => x.status === "PENDING_LANDLORD").length} yêu cầu</small></div>${button("Mở", "navigate", "residents", "small")}</div><div class="list-row"><div><strong>Dịch vụ của nhà</strong><small>Giá theo từng nhà và phòng</small></div>${button("Mở", "navigate", "services", "small")}</div></div></div></div>`;
}

function renderProperties() {
  const ownHouses = state.houses.filter((h) => h.ownerId === "quan");
  const selected = ownHouses.find((h) => h.id === state.houseSelection) || ownHouses[0];
  const rooms = state.rooms.filter((r) => r.houseId === selected.id);
  return head("Nhà & phòng", `${ownHouses.length} nhà trọ · ${rooms.length} phòng`, button(`${icon("plus")} Thêm phòng`, "open-room", "", "primary")) +
    `<div class="filter-bar"><label class="field" style="max-width:330px">Nhà trọ<select id="house-select" data-change="house">${ownHouses.map((h) => `<option value="${h.id}" ${selected.id === h.id ? "selected" : ""}>${esc(h.name)}</option>`).join("")}</select></label></div><div class="flow-banner"><div><strong>${esc(selected.name)}</strong><small>${esc(selected.address)}</small></div>${chip(`${rooms.length} phòng`, "green")}</div><div class="table-surface table-scroll"><table><thead><tr><th>Phòng</th><th>Diện tích</th><th>Sức chứa</th><th>Giá thuê</th><th>Tình trạng</th><th></th></tr></thead><tbody>${rooms.map((r) => `<tr><td><div class="room-row"><img src="${esc(r.photo)}" alt=""><div><span class="cell-title">${esc(r.code)}</span><span class="cell-sub">${esc(r.title)}</span></div></div></td><td>${r.area} m²</td><td>${r.capacity} người</td><td>${money(r.price)}</td><td>${chip(r.status === "AVAILABLE" ? "Còn phòng" : r.status === "OCCUPIED" ? "Đang ở" : r.status === "RESERVED" ? "Đã giữ" : "Bảo trì", r.status === "AVAILABLE" ? "green" : "yellow")}</td><td class="actions-cell">${button("Sửa", "edit-room", r.id, "small")}</td></tr>`).join("")}</tbody></table></div>`;
}

function renderServices() {
  const ownHouses = state.houses.filter((h) => h.ownerId === "quan");
  const selected = ownHouses.find((h) => h.id === state.houseSelection) || ownHouses[0];
  const services = state.services.filter((s) => s.houseId === selected.id);
  const rooms = state.rooms.filter((r) => r.houseId === selected.id);
  const selectedRoom = rooms.find((r) => r.id === state.roomSelection) || rooms[0];
  return head("Dịch vụ", "Cấu hình theo nhà, áp dụng riêng cho từng phòng", button(`${icon("plus")} Thêm dịch vụ`, "open-service", "", "primary")) +
    `<div class="filter-bar"><label class="field" style="max-width:330px">Nhà trọ<select data-change="house">${ownHouses.map((h) => `<option value="${h.id}" ${selected.id === h.id ? "selected" : ""}>${esc(h.name)}</option>`).join("")}</select></label></div><div class="service-grid"><section><div class="section-bar" style="margin-top:0"><h2>Dịch vụ của ${esc(selected.name)}</h2></div><div class="table-surface table-scroll"><table><thead><tr><th>Dịch vụ</th><th>Giá mặc định</th><th>Cách tính</th><th>Trạng thái</th><th></th></tr></thead><tbody>${services.map((s) => `<tr><td class="cell-title">${esc(s.name)}</td><td>${money(s.price)}/${esc(s.unit)}</td><td>${s.method === "METERED" ? "Theo đồng hồ" : s.method === "PER_PERSON" ? "Theo người" : "Theo phòng"}</td><td>${chip(s.active ? "Đang dùng" : "Ngừng dùng", s.active ? "green" : "gray")}</td><td class="actions-cell"><div class="table-actions">${button("Sửa", "edit-service", s.id, "small")}${button(s.active ? "Ngừng" : "Bật", "toggle-service", s.id, "small")}</div></td></tr>`).join("")}</tbody></table></div></section><section><div class="section-bar" style="margin-top:0"><h2>Áp dụng cho phòng</h2></div><label class="field" style="margin-bottom:9px">Phòng<select data-change="room">${rooms.map((r) => `<option value="${r.id}" ${selectedRoom.id === r.id ? "selected" : ""}>${esc(r.code)} · ${esc(r.title)}</option>`).join("")}</select></label><div class="flat-surface" style="padding:5px 14px">${services.map((s) => { const applied = state.roomServices.find((x) => x.roomId === selectedRoom.id && x.serviceId === s.id); return `<div class="checkbox-row"><input type="checkbox" id="apply-${s.id}" data-change="room-service" data-id="${s.id}" ${applied?.active ? "checked" : ""} ${!s.active ? "disabled" : ""}><div><label for="apply-${s.id}"><strong>${esc(s.name)}</strong></label><small>${applied?.override != null ? `Giá riêng ${money(applied.override)}` : `Theo nhà ${money(s.price)}`} / ${esc(s.unit)}</small></div>${applied?.active ? button("Giá riêng", "override-service", s.id, "small") : ""}</div>`; }).join("")}</div></section></div>`;
}

const POST_LABEL = { NONE: ["Chưa đăng tin", "gray"], DRAFT: ["Bản nháp", "gray"], PENDING_REVIEW: ["Chờ duyệt", "yellow"], APPROVED: ["Đã duyệt", "green"], REJECTED: ["Bị từ chối", "red"], HIDDEN: ["Đã ẩn", "gray"] };
function ownsListingRoom(r) { return state.role === "landlord" && r && house(r.houseId)?.ownerId === userId(); }
function canSubmitNewListing(r) { return ownsListingRoom(r) && ["NONE", "DRAFT", "REJECTED", "HIDDEN"].includes(r.postStatus || "NONE"); }
function renderListings() {
  const own = state.rooms.filter((r) => house(r.houseId).ownerId === "quan");
  return head("Tin đăng", "Tình trạng kiểm duyệt tách khỏi tình trạng còn phòng", button(`${icon("plus")} Tạo tin đăng`, "open-listing", "", "primary")) +
    `<div class="table-surface table-scroll"><table><thead><tr><th>Bài đăng</th><th>Nhà trọ</th><th>Giá / tháng</th><th>Kiểm duyệt</th><th>Phòng</th><th></th></tr></thead><tbody>${own.map((r) => `<tr><td><div class="room-row"><img src="${esc(r.photo)}" alt=""><div><span class="cell-title">${esc(r.title)}</span><span class="cell-sub">${esc(r.code)} · ${r.area} m²</span></div></div></td><td>${esc(house(r.houseId).name)}</td><td>${money(r.price)}</td><td>${chip(...(POST_LABEL[r.postStatus || "NONE"] || ["Chưa rõ trạng thái", "gray"]))}</td><td>${chip(r.status === "AVAILABLE" ? "Còn phòng" : r.status === "OCCUPIED" ? "Đang ở" : "Đã giữ", r.status === "AVAILABLE" ? "green" : "gray")}</td><td class="actions-cell">${button("Sửa tin", "edit-listing", r.id, "small")}</td></tr>`).join("")}</tbody></table></div>`;
}

function renderResidents() {
  const members = state.contracts.filter((c) => c.ownerId === "quan").flatMap((c) => c.members.map((m) => ({ ...m, contract: c })));
  const active = members.filter((m) => m.status === "ACTIVE");
  const planned = members.filter((m) => m.status === "PLANNED" && isLiveContract(m.contract));
  const pending = state.joinRequests.filter((j) => contract(j.contractId)?.ownerId === "quan");
  const joinLabels = { PENDING_CONSENT: "Chờ đồng ý", PENDING_LANDLORD: "Chờ duyệt", APPROVED: "Đã giữ chỗ", COMPLETED: "Đã vào ở", REJECTED: "Từ chối", CANCELLED: "Đã hủy", EXPIRED: "Hết hạn giữ chỗ" };
  const rows = [...active, ...planned].map((m) => {
    const c = m.contract;
    const isActive = m.status === "ACTIVE";
    const inconsistent = isActive && c.status !== "ACTIVE";
    const actions = isActive ? button("Xác nhận rời", "move-out", `${c.id}:${m.id}`, "small") : `${button("Xác nhận vào ở", "confirm-move-in", `${c.id}:${m.id}`, "small primary")}${button("Hủy dự kiến", "cancel-planned", `${c.id}:${m.id}`, "small")}`;
    return `<tr><td class="cell-title">${esc(m.name)}${representative(c)?.id === m.id ? '<span class="cell-sub">Đại diện</span>' : ""}</td><td>${esc(roomName(c.roomId))}${inconsistent ? '<span class="cell-sub">Cần đối soát: hợp đồng đã đóng, lượt ở còn mở</span>' : ""}</td><td>${esc(m.identity)}</td><td>${dateLabel(m.dob)}</td><td>${dateLabel(isActive ? m.moveIn : m.plannedMoveIn || c.start)}</td><td>${chip(isActive ? "Đang ở" : "Dự kiến", isActive ? "green" : "yellow")}</td><td class="actions-cell"><div class="table-actions">${actions}</div></td></tr>`;
  }).join("");
  const joins = pending.map((j) => {
    const c = contract(j.contractId);
    const available = c.status === "ACTIVE" && todayISO() >= c.start && todayISO() <= c.end;
    const actions = j.status === "PENDING_LANDLORD" ? `${available ? button("Duyệt", "approve-join", j.id, "small primary") : ""}${button("Từ chối", "reject-join", j.id, "small")}` : j.status === "APPROVED" ? `${available ? button("Xác nhận vào ở", "complete-join", j.id, "small primary") : ""}${button("Hủy giữ chỗ", "cancel-join", j.id, "small")}` : "";
    return `<div class="list-row"><div><strong>${esc(person(j.applicantId).name)} → ${esc(roomName(c.roomId))}</strong><small>Ngày dự kiến ${dateLabel(j.date)} · ${joinLabels[j.status]}${j.status === "APPROVED" ? ` · Giữ đến ${dateLabel(todayISO(Date.parse(j.holdExpiresAt)))} ${vietnamTime(Date.parse(j.holdExpiresAt))} (UTC+7)` : ""}${!available && ["PENDING_LANDLORD", "APPROVED"].includes(j.status) ? " · Hợp đồng không còn cho phép vào ở" : ""}</small></div><div class="table-actions">${actions}</div></div>`;
  }).join("");
  const history = members.filter((m) => ["LEFT", "CANCELLED"].includes(m.status)).map((m) => `<tr><td>${esc(m.name)}</td><td>${esc(roomName(m.contract.roomId))}</td><td>${dateLabel(m.moveIn)}</td><td>${dateLabel(m.moveOut)}</td><td>${chip(m.status === "LEFT" ? "Đã rời" : "Đã hủy dự kiến", "gray")}</td></tr>`).join("");
  return head("Người ở trọ", `${active.length} người đang ở · ${planned.length} người dự kiến`, button(`${icon("download")} Xuất CSV cư trú`, "export-residents", "", "primary")) +
    `<div class="table-surface table-scroll"><table><thead><tr><th>Họ tên</th><th>Phòng / nhà</th><th>CCCD</th><th>Ngày sinh</th><th>Vào ở / dự kiến</th><th>Trạng thái</th><th></th></tr></thead><tbody>${rows || '<tr><td colspan="7">Chưa có người ở.</td></tr>'}</tbody></table></div><div class="section-bar"><h2>Yêu cầu thêm người</h2></div><div class="flat-surface" style="padding:0 15px">${joins || '<div class="list-row"><span class="muted tiny">Chưa có yêu cầu.</span></div>'}</div>${history ? `<div class="section-bar"><h2>Lịch sử lượt ở</h2></div><div class="table-surface table-scroll"><table><thead><tr><th>Họ tên</th><th>Phòng / nhà</th><th>Ngày vào</th><th>Ngày ra</th><th>Trạng thái</th></tr></thead><tbody>${history}</tbody></table></div>` : ""}`;
}

function renderInvoices() {
  const own = state.invoices.filter((i) => { const c = contract(i.contractId); return state.role === "tenant" ? i.payerId === userId() || c?.tenantId === userId() : c?.ownerId === "quan"; });
  const selected = own.find((i) => i.id === state.selectedInvoice) || own[0];
  if (selected) state.selectedInvoice = selected.id;
  const selectedContract = selected && contract(selected.contractId);
  const invoiceActions = state.role === "landlord" ? `${selected?.status === "DRAFT" ? button(`${icon("pencil")} Sửa bản nháp`, "edit-invoice", selected.id) : ""}${button(`${icon("plus")} Lập hóa đơn`, "open-invoice", "", "primary")}` : "";
  return head("Hóa đơn", state.role === "tenant" ? "Theo dõi các khoản đã phát hành và lịch sử thanh toán" : "Tiền phòng và dịch vụ theo kỳ", invoiceActions) +
    `<div class="split-grid"><div><div class="table-surface table-scroll">${own.length ? `<table><thead><tr><th>Mã hóa đơn</th><th>Phòng / kỳ</th><th>Hạn thanh toán</th><th>Tổng</th><th>Trạng thái</th><th></th></tr></thead><tbody>${own.map((i) => `<tr><td class="cell-title">${esc(i.code)}</td><td>${esc(room(contract(i.contractId).roomId).code)}<span class="cell-sub">${monthLabel(i.period)}</span></td><td>${dateLabel(i.due)}</td><td class="strong">${money(totalInvoice(i))}</td><td>${chip(i.status === "PAID" ? "Đã thu" : i.status === "UNPAID" ? "Chưa thu" : i.status === "DRAFT" ? "Bản nháp" : "Đã hủy", i.status === "PAID" ? "green" : i.status === "UNPAID" ? "orange" : "gray")}</td><td class="actions-cell">${button("Chi tiết", "invoice-detail", i.id, "small")}</td></tr>`).join("")}</tbody></table>` : empty("Chưa có hóa đơn", "Hóa đơn theo hợp đồng sẽ xuất hiện tại đây.")}</div></div>${selected ? `<aside><div class="section-bar" style="margin-top:0"><h2>${esc(selected.code)}</h2>${chip(selected.status === "PAID" ? "Đã thu" : selected.status === "UNPAID" ? "Chưa thu" : "Bản nháp", selected.status === "PAID" ? "green" : "orange")}</div><div class="flat-surface"><div class="invoice-detail"><div><span>Phòng</span><strong>${esc(roomName(selectedContract.roomId))}</strong></div><div><span>Kỳ thu</span><strong>${monthLabel(selected.period)}</strong></div><div><span>Người trả</span><strong>${esc(person(selected.payerId).name)}</strong></div><div><span>Hạn thanh toán</span><strong>${dateLabel(selected.due)}</strong></div></div><div class="table-scroll"><table><thead><tr><th>Khoản</th><th>Số lượng</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead><tbody>${selected.items.map((item) => `<tr><td>${esc(item.name)}</td><td>${item.quantity} ${esc(item.unit)}</td><td>${money(item.price)}</td><td>${money(item.quantity * item.price)}</td></tr>`).join("")}</tbody></table></div><div class="total-line"><span>Tổng cần thanh toán</span><strong>${money(totalInvoice(selected))}</strong></div></div>${state.role === "landlord" ? `<div class="heading-actions" style="margin-top:12px">${selected.status === "DRAFT" ? button("Phát hành", "issue-invoice", selected.id, "primary") : ""}${selected.status === "UNPAID" ? `${button("Xác nhận đã thu", "pay-invoice", selected.id, "primary")}${button("Hủy hóa đơn", "cancel-invoice", selected.id, "danger")}` : ""}</div>` : ""}</aside>` : ""}</div>`;
}

function roommateProfileFor(id) {
  return id === "lan" ? state.roommateProfile || seed.roommateProfile : state.roommateProfiles?.[id] || seed.roommateProfiles[id];
}
function roommateProfileSummary(id) {
  const profile = roommateProfileFor(id);
  if (!profile) return '<p class="muted tiny">Người này chưa cập nhật tiêu chí ở ghép.</p>';
  const current = state.contracts.find((c) => c.members.some((m) => m.tenantId === id && m.status === "ACTIVE"));
  return `<div class="list-row"><div><strong>Khu vực</strong><small>${esc(profile.location)}</small></div></div><div class="list-row"><div><strong>Ngân sách / tháng</strong><small>${shortMoney(profile.budgetMin)}–${shortMoney(profile.budgetMax)}</small></div></div><div class="list-row"><div><strong>Thói quen / mong muốn</strong><small>${esc(profile.habits)}</small></div></div><div class="list-row"><div><strong>Sẵn sàng từ</strong><small>${dateLabel(profile.available)}</small></div></div><div class="list-row"><div><strong>Tình trạng chỗ ở</strong><small>${current ? `Đang ở ${esc(roomName(current.roomId))}` : "Đang tìm người trao đổi về chỗ ở"}</small></div></div>`;
}
function sameRoommatePair(invite, first, second) {
  return first !== second && [first, second].includes(invite.senderId) && [first, second].includes(invite.receiverId) && invite.senderId !== invite.receiverId;
}
function openRoommateInvite(peer) {
  const candidates = state.roommateInvites.filter((x) => sameRoommatePair(x, userId(), peer) && !x.endedAt);
  return candidates.find((x) => x.status === "ACCEPTED") || candidates.find((x) => x.status === "PENDING");
}
function roommateConnectionAction(peer) {
  const invite = openRoommateInvite(peer);
  if (invite?.status === "ACCEPTED") return button("Nhắn tin", "chat-roommate", invite.id, "small primary");
  if (invite?.receiverId === userId()) return button("Chấp nhận kết nối", "accept-roommate", invite.id, "small primary");
  if (invite) return button("Đã gửi lời mời", "send-roommate", peer, "small", "disabled");
  return button("Kết nối", "send-roommate", peer, "small");
}
function openRoommateProfile(id) {
  if (state.role !== "tenant" || !PEOPLE[id] || id === userId()) return;
  const invite = openRoommateInvite(id);
  modal("Hồ sơ ở ghép", `<div class="account-row">${avatar(id)}<div class="account-copy"><strong>${esc(person(id).name)}</strong><small>Thông tin chia sẻ để tìm người ở ghép</small></div></div>${roommateProfileSummary(id)}<p class="muted tiny">Chấp nhận kết nối để nhắn tin tìm hiểu. Thuê chung cần thỏa thuận riêng.</p><div class="form-actions">${button("Đóng", "close-dialog")}${invite?.status === "PENDING" && invite.receiverId === userId() ? button("Từ chối", "reject-roommate", invite.id) : ""}${roommateConnectionAction(id)}</div>`);
}
function renderRoommates() {
  const me = userId();
  const incoming = state.roommateInvites.filter((x) => x.receiverId === me);
  const outgoing = state.roommateInvites.filter((x) => x.senderId === me);
  const matches = ["bao", "ngoc", "mai"].filter((id) => id !== me);
  const invitationList = (items, received) => items.map((item) => {
    const peer = received ? item.senderId : item.receiverId;
    const labels = { PENDING: received ? "Chờ bạn phản hồi" : "Chờ phản hồi", ACCEPTED: item.endedAt ? "Đã kết thúc kết nối" : "Đã kết nối", REJECTED: "Đã từ chối", CANCELLED: "Đã hủy" };
    const actions = item.status === "PENDING" && received ? `${button("Chấp nhận kết nối", "accept-roommate", item.id, "small primary")}${button("Từ chối", "reject-roommate", item.id, "small")}` : item.status === "ACCEPTED" && !item.endedAt ? button("Nhắn tin", "chat-roommate", item.id, "small primary") : "";
    return `<div class="list-row roommate-row">${avatar(peer)}<div class="roommate-copy"><strong>${esc(person(peer).name)}</strong><small>${esc(item.note)}</small>${chip(labels[item.status] || "Chưa rõ trạng thái", item.status === "ACCEPTED" && !item.endedAt ? "green" : "gray")}</div><div class="table-actions">${button("Xem hồ sơ", "roommate-profile", peer, "small")}${actions}</div></div>`;
  }).join("") || '<p class="muted tiny">Chưa có lời mời.</p>';
  return head("Tìm người ở ghép", "Kết nối để trò chuyện và tìm hiểu trước khi quyết định thuê chung", button(`${icon("sliders-horizontal")} Sửa tiêu chí`, "edit-roommate-profile")) +
    `<div class="split-grid"><div><div class="section-bar" style="margin-top:0"><h2>Người phù hợp</h2></div><div class="flat-surface" style="padding:0 16px">${matches.map((id) => { const profile = roommateProfileFor(id); return `<div class="list-row roommate-row">${avatar(id)}<div class="roommate-copy"><strong>${esc(person(id).name)}</strong><small>${esc(profile?.location)} · ${profile ? `Ngân sách ${shortMoney(profile.budgetMin)}–${shortMoney(profile.budgetMax)}` : "Chưa cập nhật tiêu chí"}</small></div><div class="table-actions">${button("Xem hồ sơ", "roommate-profile", id, "small")}${roommateConnectionAction(id)}</div></div>`; }).join("")}</div><div class="section-bar"><h2>Lời mời dành cho bạn</h2></div><div class="flat-surface" style="padding:0 16px">${invitationList(incoming, true)}</div>${outgoing.length ? `<div class="section-bar"><h2>Lời mời đã gửi</h2></div><div class="flat-surface" style="padding:0 16px">${invitationList(outgoing, false)}</div>` : ""}</div><aside><div class="subtle-panel"><h3>Hồ sơ ở ghép của bạn</h3>${roommateProfileSummary(me)}</div></aside></div>`;
}

function renderVerifications() {
  return head("Xác minh hồ sơ", `${state.verifications.filter((x) => x.status === "PENDING").length} hồ sơ chờ duyệt`) +
    `<div class="table-surface table-scroll"><table><thead><tr><th>Người gửi</th><th>Loại hồ sơ</th><th>Ngày gửi</th><th>Trạng thái</th><th></th></tr></thead><tbody>${state.verifications.map((v) => `<tr><td class="cell-title">${esc(person(v.userId).name)}</td><td>${esc(v.type)}</td><td>${dateLabel(v.date)}</td><td>${chip(v.status === "PENDING" ? "Chờ duyệt" : v.status === "APPROVED" ? "Đã duyệt" : "Từ chối", v.status === "PENDING" ? "yellow" : v.status === "APPROVED" ? "green" : "red")}</td><td class="actions-cell">${v.status === "PENDING" ? `<div class="table-actions">${button("Duyệt", "approve-verification", v.id, "small primary")}${button("Từ chối", "reject-verification", v.id, "small")}</div>` : ""}</td></tr>`).join("")}</tbody></table></div>`;
}

function renderModeration() {
  const pending = state.rooms.filter((r) => r.postStatus === "PENDING_REVIEW" || r.postStatus === "HIDDEN");
  return head("Duyệt tin đăng", `${pending.filter((r) => r.postStatus === "PENDING_REVIEW").length} tin chờ duyệt`) +
    `<div class="table-surface table-scroll">${pending.length ? `<table><thead><tr><th>Bài đăng</th><th>Chủ trọ</th><th>Giá</th><th>Trạng thái</th><th></th></tr></thead><tbody>${pending.map((r) => `<tr><td><div class="room-row"><img src="${esc(r.photo)}" alt=""><div><span class="cell-title">${esc(r.title)}</span><span class="cell-sub">${esc(roomName(r.id))}</span></div></div></td><td>${esc(person(house(r.houseId).ownerId).name)}</td><td>${money(r.price)}</td><td>${chip(r.postStatus === "PENDING_REVIEW" ? "Chờ duyệt" : "Đã ẩn", r.postStatus === "PENDING_REVIEW" ? "yellow" : "red")}</td><td class="actions-cell"><div class="table-actions">${button("Xem", "room-detail", r.id, "small")}${r.postStatus === "PENDING_REVIEW" ? `${button("Duyệt", "approve-listing", r.id, "small primary")}${button("Từ chối", "reject-listing", r.id, "small")}` : button("Hiện lại", "restore-listing", r.id, "small")}</div></td></tr>`).join("")}</tbody></table>` : empty("Không có tin chờ duyệt", "Hàng đợi đã được xử lý.")}</div>`;
}

function renderTemplates() {
  const rows = state.templates || [];
  return head("Mẫu hợp đồng", `${rows.length} phiên bản mẫu`, button(`${icon("plus")} Phiên bản mới`, "open-template", "", "primary")) +
    `<div class="table-surface table-scroll"><table><thead><tr><th>Tên mẫu</th><th>Phiên bản</th><th>Nội dung</th><th>Trạng thái</th><th></th></tr></thead><tbody>${rows.map((item) => `<tr><td class="cell-title">${esc(item.name)}</td><td>v${item.version}</td><td>${esc(item.content.slice(0, 110))}${item.content.length > 110 ? "..." : ""}</td><td>${chip(item.active ? "Đang dùng" : "Ngừng dùng", item.active ? "green" : "gray")}</td><td class="actions-cell">${button(item.active ? "Ngừng" : "Bật", "toggle-template", item.id, "small")}</td></tr>`).join("")}</tbody></table></div>`;
}

function renderAudit() {
  const rows = [...(state.audit || [])].reverse();
  return head("Nhật ký kiểm duyệt", `${rows.length} hành động đã ghi`) +
    `<div class="table-surface table-scroll"><table><thead><tr><th>Thời gian</th><th>Người xử lý</th><th>Hành động</th><th>Đối tượng</th><th>Lý do</th></tr></thead><tbody>${rows.map((entry) => `<tr><td>${dateLabel(entry.date)}</td><td>${esc(person(entry.actorId).name)}</td><td class="cell-title">${esc(entry.action)}</td><td>${esc(entry.target)}</td><td>${esc(entry.reason)}</td></tr>`).join("")}</tbody></table></div>`;
}

function renderReports() {
  return head("Báo cáo & tranh chấp", `${state.reports.filter((r) => r.status === "PENDING").length} báo cáo mới`) +
    `<div class="table-surface table-scroll">${state.reports.length ? `<table><thead><tr><th>Đối tượng</th><th>Người báo cáo</th><th>Lý do</th><th>Ngày gửi</th><th>Trạng thái</th><th></th></tr></thead><tbody>${state.reports.map((r) => `<tr><td class="cell-title">${esc(r.target)}</td><td>${esc(person(r.from).name)}</td><td>${esc(r.reason)}</td><td>${dateLabel(r.date)}</td><td>${chip(r.status === "PENDING" ? "Chờ xử lý" : "Đã xử lý", r.status === "PENDING" ? "yellow" : "green")}</td><td class="actions-cell">${r.status === "PENDING" ? button("Xử lý", "resolve-report", r.id, "small primary") : ""}</td></tr>`).join("")}</tbody></table>` : empty("Chưa có báo cáo", "")}</div>`;
}

function renderUsers() {
  const locked = state.lockedUsers || [];
  return head("Người dùng", `${Object.keys(PEOPLE).length} tài khoản`) +
    `<div class="table-surface table-scroll"><table><thead><tr><th>Người dùng</th><th>Vai trò</th><th>Trạng thái</th><th></th></tr></thead><tbody>${Object.entries(PEOPLE).filter(([id]) => id !== "admin").map(([id, p]) => `<tr><td><div class="room-row">${avatar(id)}<span class="cell-title">${esc(p.name)}</span></div></td><td>${["quan", "huong"].includes(id) ? "Chủ trọ" : "Người thuê"}</td><td>${chip(locked.includes(id) ? "Đã khóa" : "Hoạt động", locked.includes(id) ? "red" : "green")}</td><td class="actions-cell">${button(locked.includes(id) ? "Mở khóa" : "Khóa", "toggle-user", id, "small")}</td></tr>`).join("")}</tbody></table></div>`;
}

function renderProfile() {
  const me = userId();
  const p = person(me);
  const verification = state.verifications.find((v) => v.userId === me);
  const sessions = [{ device: "Chrome · Windows", time: "Hôm nay, 09:40", current: true }, { device: "Safari · iPhone", time: "21/10/2026, 20:15", current: false }];
  return head("Tài khoản", `${p.name}`) +
    `<div class="profile-grid"><div><div class="section-bar" style="margin-top:0"><h2>Thông tin cá nhân</h2></div><div class="flat-surface" style="padding:17px"><div class="account-row" style="margin-bottom:17px">${avatar(me)}<div class="account-copy"><strong style="color:var(--ink);font-size:14px">${esc(p.name)}</strong><small>${state.role === "tenant" ? "Người thuê" : state.role === "landlord" ? "Chủ trọ" : "Quản trị viên"}</small></div></div><form class="form-grid" data-form="profile"><label class="field">Họ và tên<input name="fullName" value="${esc(p.name)}" required></label><label class="field">Số điện thoại<input name="phone" value="098 245 6758"></label><label class="field">Email<input name="email" type="email" value="${me}@troday.vn"></label><label class="field">Địa chỉ liên hệ<input name="address" value="Hà Nội"></label><div class="field full"><button class="button primary" type="submit">${icon("save")} Lưu thay đổi</button></div></form></div></div><aside><div class="section-bar" style="margin-top:0"><h2>Xác minh danh tính</h2></div><div class="subtle-panel"><div class="list-row"><div><strong>Trạng thái</strong><small>${verification ? verification.status === "PENDING" ? "Đang chờ kiểm duyệt" : verification.status === "APPROVED" ? "Đã xác minh" : "Cần bổ sung" : state.role === "landlord" ? "Đã xác minh chủ trọ" : "Chưa gửi hồ sơ"}</small></div>${chip(verification?.status === "APPROVED" || state.role === "landlord" ? "Đã duyệt" : "Chưa duyệt", verification?.status === "APPROVED" || state.role === "landlord" ? "green" : "yellow")}</div>${state.role === "tenant" && !verification ? button("Gửi giấy tờ", "open-identity", "", "small") : ""}</div><div class="section-bar"><h2>Phiên đăng nhập</h2></div><div class="flat-surface" style="padding:0 15px">${sessions.map((s) => `<div class="list-row"><div><strong>${s.device}</strong><small>${s.time}</small></div>${s.current ? chip("Hiện tại", "green") : button("Thu hồi", "revoke-session", "", "small")}</div>`).join("")}</div></aside></div>`;
}

// Business dates and viewing inputs always use Vietnam time, independently of the device zone.
function vietnamParts(timestamp = Date.now()) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(timestamp);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}
function todayISO(timestamp = Date.now()) {
  const p = vietnamParts(timestamp);
  return `${p.year}-${p.month}-${p.day}`;
}
function vietnamTime(timestamp) {
  const p = vietnamParts(timestamp);
  return `${p.hour}:${p.minute}`;
}
function appointmentTimestamp(date, time) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return NaN;
  const timestamp = Date.parse(`${date}T${time}:00+07:00`);
  return Number.isFinite(timestamp) && todayISO(timestamp) === date && vietnamTime(timestamp) === time ? timestamp : NaN;
}
function viewingStart(v) { return v.startsAt ? Date.parse(v.startsAt) : appointmentTimestamp(v.date, v.time); }
function viewingEnd(v) { return v.endsAt ? Date.parse(v.endsAt) : viewingStart(v) + 60 * 60 * 1000; }
function viewingTimeLabel(v) { return `${vietnamTime(viewingStart(v))}–${vietnamTime(viewingEnd(v))}${todayISO(viewingEnd(v)) !== v.date ? ` (${dateLabel(todayISO(viewingEnd(v)))})` : ""}`; }
function liveViewingContract(viewingId) { return state.contracts.find((c) => c.viewingId === viewingId && ["DRAFT", "PENDING_CONFIRMATION", "CONFIRMED", "ACTIVE"].includes(c.status)); }
function representative(c) { return c.members.find((m) => c.representativeId ? m.id === c.representativeId : m.tenantId === c.tenantId); }
function ensureRepresentativeHistory(c) {
  const rep = representative(c);
  if (!rep) return;
  c.representativeId ||= rep.id;
  // The original viewing tenant is evidence of intake, independently of the current representative.
  if (c.source === "NEW_RENTAL" && !c.viewingTenantId) c.viewingTenantId = byId(state.viewings, c.viewingId)?.tenantId || c.tenantId;
  if (!Array.isArray(c.representativeHistory)) {
    c.representativeHistory = [{ roomTenantId: rep.id, tenantId: rep.tenantId, nameSnapshot: rep.name, fromAt: c.representativeSinceAt || null, toAt: c.closedAt || null, ended: !isLiveContract(c), actorId: null, reason: c.representativeSinceAt ? "Đại diện ban đầu của hợp đồng." : "Ghi nhận từ dữ liệu cũ; chưa rõ thời điểm bắt đầu.", recordedAt: new Date().toISOString() }];
  }
}
function endRepresentativeTenure(c, timestamp) {
  ensureRepresentativeHistory(c);
  const current = c.representativeHistory?.findLast((entry) => !entry.ended);
  if (current) { current.toAt = timestamp; current.ended = true; }
}
function representativeCandidates(c, departingId) {
  return c.members.filter((m) => m.id !== departingId && m.status === "ACTIVE" && m.tenantId && !(state.lockedUsers || []).includes(m.tenantId));
}
function timestampLabel(value) {
  return value ? new Date(value).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour12: false }) : "Chưa rõ (dữ liệu cũ)";
}
function openRepresentativeHistory(id) {
  const c = contract(id);
  if (!c || !(ownsContract(c) || (state.role === "tenant" && c.members.some((m) => m.tenantId === userId())))) return;
  ensureRepresentativeHistory(c);
  const rows = c.representativeHistory.map((entry) => `<tr><td>${esc(entry.nameSnapshot)}</td><td>${esc(timestampLabel(entry.fromAt))}</td><td>${entry.ended ? esc(timestampLabel(entry.toAt)) : "Hiện tại"}</td><td>${entry.actorId ? esc(person(entry.actorId).name) : "Dữ liệu ban đầu"}</td><td>${esc(entry.reason)}</td></tr>`).join("");
  modal(`Lịch sử đại diện · ${c.number}`, `<p class="muted tiny">Thời gian theo giờ Việt Nam (UTC+7). ${isLiveContract(c) ? "Đại diện hiện tại" : "Đại diện gần nhất"}: ${esc(representative(c)?.name || "Chưa có")}. Các giai đoạn đã ghi nhận được giữ lại sau khi đổi người.</p><div class="table-scroll"><table><thead><tr><th>Đại diện</th><th>Từ</th><th>Đến</th><th>Người ghi nhận</th><th>Lý do</th></tr></thead><tbody>${rows}</tbody></table></div><div class="form-actions">${button("Đóng", "close-dialog", "", "primary")}</div>`);
}
function openRepresentativeHandover(c, departing) {
  const candidates = representativeCandidates(c, departing.id);
  if (c.status !== "ACTIVE") { flash("Hợp đồng không còn hoạt động; cần đối soát lượt ở trước khi bàn giao đại diện."); return; }
  if (!candidates.length) { modal("Chưa có người đủ điều kiện tiếp nhận", `<p>Chỉ chọn người đang ở trong hợp đồng, đã liên kết tài khoản và không bị khóa. Thành viên dự kiến chưa thể tiếp nhận đại diện. Hãy hoàn tất thông tin hoặc xác nhận vào ở trước.</p><div class="form-actions">${button("Đã hiểu", "close-dialog", "", "primary")}</div>`); return; }
  modal("Bàn giao đại diện và xác nhận rời phòng", `<form data-form="representative-handover"><input type="hidden" name="contractId" value="${c.id}"><input type="hidden" name="departingId" value="${departing.id}"><p><strong>${esc(departing.name)}</strong> rời ${esc(roomName(c.roomId))}. Hợp đồng tiếp tục cho những người ở lại.</p><label class="field">Đại diện tiếp nhận<select name="successorId" required>${candidates.length > 1 ? '<option value="">Chọn một người đang ở</option>' : ""}${candidates.map((m) => `<option value="${esc(m.id)}">${esc(m.name)}</option>`).join("")}</select></label><p class="muted tiny">${candidates.length === 1 ? "Phòng chỉ còn một người đủ điều kiện, hệ thống đã chọn sẵn." : "Phòng còn nhiều người, cần chọn người tiếp nhận."} Bàn giao có hiệu lực ngay khi xác nhận.</p><label class="field">Lý do bàn giao<textarea name="reason" required maxlength="1000">Đại diện hiện tại rời phòng, bàn giao cho người ở lại.</textarea></label><label class="checkbox-row"><input type="checkbox" name="consent" value="yes" required><div>Đã có sự đồng ý của người tiếp nhận đại diện</div></label><div class="form-actions">${button("Quay lại", "close-dialog")}<button type="submit" class="button primary">Bàn giao và xác nhận rời</button></div></form>`);
}
function ownsContract(c) { return state.role === "landlord" && c?.ownerId === userId(); }
function isLiveContract(c) { return ["DRAFT", "PENDING_CONFIRMATION", "CONFIRMED", "ACTIVE"].includes(c.status); }
function hasActiveAccount(tenantId, exceptMemberId = "") {
  return tenantId && state.contracts.some((c) => c.members.some((m) => m.tenantId === tenantId && m.status === "ACTIVE" && m.id !== exceptMemberId));
}
function hasLiveRoomContract(roomId, exceptContractId = "") {
  return state.contracts.some((c) => c.roomId === roomId && c.id !== exceptContractId && isLiveContract(c));
}
function expireJoinHolds() {
  let changed = false;
  for (const j of state.joinRequests) {
    if (j.status === "APPROVED" && (!Number.isFinite(Date.parse(j.holdExpiresAt)) || Date.parse(j.holdExpiresAt) <= Date.now())) {
      // Old prototypes did not record an expiry. Release those unbounded reservations too.
      j.status = "EXPIRED"; changed = true;
    }
  }
  if (changed) save();
}
function heldJoins(roomId, exceptId = "") {
  return state.joinRequests.filter((j) => j.id !== exceptId && contract(j.contractId)?.roomId === roomId && j.status === "APPROVED" && Date.parse(j.holdExpiresAt) > Date.now());
}
function roomLoad(roomId, exceptJoinId = "") {
  const members = state.contracts.filter((c) => c.roomId === roomId).flatMap((c) => c.members.filter((m) => m.status === "ACTIVE" || (m.status === "PLANNED" && isLiveContract(c))));
  return members.length + heldJoins(roomId, exceptJoinId).filter((j) => !members.some((m) => m.joinRequestId === j.id)).length;
}
function syncRoomStatus(roomId) {
  const r = room(roomId);
  if (!r) return;
  if (state.contracts.some((c) => c.roomId === roomId && c.members.some((m) => m.status === "ACTIVE"))) r.status = "OCCUPIED";
  else if (hasLiveRoomContract(roomId)) r.status = "RESERVED";
  else if (r.status !== "MAINTENANCE") r.status = "AVAILABLE";
}
function cancelContractJoins(c, reason) {
  for (const j of state.joinRequests.filter((j) => j.contractId === c.id && ["PENDING_CONSENT", "PENDING_LANDLORD", "APPROVED"].includes(j.status))) {
    j.status = "CANCELLED"; j.cancelledAt = new Date().toISOString(); j.cancellationReason = reason;
  }
}
function closeStays(c, date, reason) {
  endRepresentativeTenure(c, new Date().toISOString());
  for (const m of c.members) {
    if (m.status === "ACTIVE") Object.assign(m, { status: "LEFT", moveOut: date, moveOutConfirmedBy: userId(), moveOutConfirmedAt: new Date().toISOString() });
    else if (m.status === "PLANNED") Object.assign(m, { status: "CANCELLED", cancellationReason: reason });
  }
  cancelContractJoins(c, reason);
  c.closedAt = new Date().toISOString(); c.closureReason = reason;
}

function viewingConversationValid(c, r, tenantId, ownerId) {
  return c && c.type !== "ROOMMATE" && c.users.length === 2 && tenantId !== ownerId && c.users.includes(tenantId) && c.users.includes(ownerId)
    && r?.postStatus === "APPROVED" && house(r.houseId)?.ownerId === ownerId && chatRoomChoices(c).includes(r.id)
    && ![tenantId, ownerId].some((id) => (state.lockedUsers || []).includes(id));
}
function tenantExchangedAboutRoom(c, roomId, tenantId) {
  return c.messages.some((m) => m.roomId === roomId && m.senderId === tenantId && (!m.messageType || ["TEXT", "IMAGE"].includes(m.messageType)) && m.text?.trim());
}
function viewingIntervalError(r, start, end) {
  if (!r || r.status !== "AVAILABLE" || hasLiveRoomContract(r.id) || roomLoad(r.id)) return "Phòng không còn trống để tạo lịch xem.";
  if (!Number.isFinite(start) || start <= Date.now() || ![30,60,90,120].includes((end - start) / 60000)) return "Giờ xem phải ở tương lai theo giờ Việt Nam, thời lượng 30/60/90/120 phút.";
  if (state.viewings.some((v) => v.roomId === r.id && v.status === "SCHEDULED" && start < viewingEnd(v) && end > viewingStart(v))) return "Phòng đã có lịch xem trùng giờ.";
  return "";
}
function proposalRequestKey() {
  return globalThis.crypto?.randomUUID?.() || "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => { const n = Math.floor(Math.random()*16); return (char === "x" ? n : (n & 3) | 8).toString(16); });
}
function expireViewingProposals() {
  for (const p of state.viewingProposals) if (p.status === "PENDING" && viewingStart(p) <= Date.now()) Object.assign(p, { status: "EXPIRED", expiredAt: new Date().toISOString() });
}
function notifyViewingProposal(p, user, text) {
  const id = `np-${p.id}-${p.status}`;
  if (!state.notifications.some((n) => n.id === id)) state.notifications.push({ id, userId: user, proposalId: p.id, text, read: false });
}
function scheduledViewing(c, r, tenantId, ownerId, date, time, start, end, notes, sourceProposalId = null) {
  const viewingId = `v${Date.now()}-${state.viewings.length}`;
  const v = { id: viewingId, roomId: r.id, tenantId, ownerId, createdBy: ownerId, conversationId: c.id, date, time, startsAt: new Date(start).toISOString(), endsAt: new Date(end).toISOString(), status: "SCHEDULED", decision: "WAITING", notes, sourceProposalId };
  state.viewings.push(v); return v;
}
function acceptViewingProposal(id) {
  expireViewingProposals();
  const p = byId(state.viewingProposals, id);
  if (state.role !== "landlord" || !p || p.ownerId !== userId() || (state.lockedUsers || []).includes(userId())) return;
  if (p.status === "ACCEPTED") { flash("Đề nghị này đã được chấp nhận; lịch cũ được giữ nguyên."); return; }
  if (p.status !== "PENDING") { flash("Đề nghị không còn chờ duyệt."); return; }
  const c = byId(state.conversations, p.conversationId), r = room(p.roomId);
  if (!viewingConversationValid(c, r, p.tenantId, p.ownerId)) { flash("Phòng hoặc người tham gia hội thoại không còn hợp lệ."); return; }
  const error = viewingIntervalError(r, viewingStart(p), viewingEnd(p));
  if (error) { flash(error); return; }
  const v = scheduledViewing(c, r, p.tenantId, p.ownerId, p.date, p.time, viewingStart(p), viewingEnd(p), p.notes, p.id);
  Object.assign(p, { status: "ACCEPTED", reviewedBy: userId(), reviewedAt: new Date().toISOString(), scheduledViewingId: v.id });
  notifyViewingProposal(p, p.tenantId, `Chủ trọ đã chấp nhận đề nghị xem ${r.code} và tạo lịch hẹn.`);
  finish("Đã chấp nhận và tạo lịch xem. Phòng chưa được giữ chỗ thuê.");
}
const PROPOSAL_LABEL = { PENDING: ["Chờ chủ trọ duyệt", "yellow"], ACCEPTED: ["Đã chấp nhận", "green"], REJECTED: ["Bị từ chối", "red"], WITHDRAWN: ["Đã rút", "gray"], EXPIRED: ["Hết hạn", "gray"] };
function renderViewingProposals(conversation = null) {
  if (conversation?.type === "ROOMMATE") return "";
  const mine = state.viewingProposals.filter((p) => (state.role === "landlord" ? p.ownerId === userId() : state.role === "tenant" && p.tenantId === userId()) && room(p.roomId)
    && (!conversation || p.conversationId === conversation.id && conversation.users.includes(p.ownerId) && conversation.users.includes(p.tenantId)));
  if (!mine.length) return "";
  return `<section class="chat-viewings" aria-label="Đề nghị lịch xem"><h3>Đề nghị lịch xem · ${mine.filter((p) => p.status === "PENDING").length} chờ duyệt</h3>${mine.map((p) => {
    const actions = p.status !== "PENDING" ? "" : state.role === "landlord" ? button("Chấp nhận lịch", "accept-viewing-proposal", p.id, "small primary") + button("Từ chối", "reject-viewing-proposal", p.id, "small") : button("Rút đề nghị", "withdraw-viewing-proposal", p.id, "small");
    return `<article class="chat-viewing-card" data-proposal-id="${esc(p.id)}"><div class="chat-viewing-heading"><strong>Đề nghị xem ${esc(room(p.roomId).code)}</strong>${chip(...PROPOSAL_LABEL[p.status])}</div><p class="chat-viewing-time">${dateLabel(p.date)} · ${viewingTimeLabel(p)} (UTC+7)</p><p class="muted tiny">${esc(person(p.tenantId).name)} → ${esc(person(p.ownerId).name)}</p>${p.notes ? `<p class="chat-viewing-note">${esc(p.notes)}</p>` : ""}${p.rejectionReason ? `<p class="chat-viewing-note">Lý do: ${esc(p.rejectionReason)}</p>` : ""}<p class="muted tiny">${p.status === "ACCEPTED" ? "Đã tạo lịch chính thức; kết quả và thao tác hủy ở lịch tương ứng." : "Đề nghị chưa giữ khung giờ hoặc giữ chỗ thuê."}</p><div class="chat-viewing-actions">${actions}</div></article>`;
  }).join("")}</section>`;
}
function openAppointment(mode = "DIRECT", roomId = "") {
  const request = mode === "REQUEST";
  if (request ? state.role !== "tenant" : state.role !== "landlord") return;
  let c;
  if (request && roomId) {
    const r = room(roomId);
    if (!r || r.postStatus !== "APPROVED" || r.status !== "AVAILABLE" || hasLiveRoomContract(r.id) || roomLoad(r.id)) { flash("Phòng hiện không thể đề nghị xem."); return; }
    const owner = house(r.houseId).ownerId;
    c = visibleConversations().find((x) => x.type !== "ROOMMATE" && x.users.includes(owner) && x.users.length === 2);
    if (!c) { c = { id: `c-inquiry-${Date.now()}-${state.conversations.length}`, type: "ROOM_INQUIRY", users: [userId(), owner], messages: [] }; state.conversations.push(c); }
    c.roomIds = [...new Set([...(c.roomIds || []), roomId])];
    state.selectedConversation = c.id;
  } else {
    c = visibleConversations().find((x) => x.id === state.selectedConversation && x.type !== "ROOMMATE");
    if (!c && state.view !== "chats") c = visibleConversations().find((x) => x.type !== "ROOMMATE");
  }
  if (!c) { flash("Hãy mở phòng trên Khám phá hoặc chat đúng chủ trọ trước khi hẹn xem."); return; }
  const ownerId = request ? otherUser(c) : userId(), tenantId = request ? userId() : otherUser(c);
  const relatedRooms = chatRoomChoices(c).filter((id) => {
    const r = room(id);
    return viewingConversationValid(c, r, tenantId, ownerId) && r.status === "AVAILABLE" && !hasLiveRoomContract(id) && !roomLoad(id) && (request || tenantExchangedAboutRoom(c, id, tenantId));
  });
  if (!relatedRooms.length) { flash("Hãy trao đổi về phòng còn trống trong đúng hội thoại trước khi tạo lịch."); return; }
  const suggested = Math.ceil((Date.now() + 15 * 60 * 1000) / (30 * 60 * 1000)) * 30 * 60 * 1000;
  const selected = roomId || (relatedRooms.includes(state.chatContext) ? state.chatContext : relatedRooms[0]);
  modal(request ? "Đề nghị lịch xem phòng" : "Tạo lịch xem phòng", `<form data-form="${request ? "viewing-request" : "appointment"}"><input type="hidden" name="conversationId" value="${esc(c.id)}">${request ? `<input type="hidden" name="clientRequestKey" value="${proposalRequestKey()}">` : ""}<p class="muted tiny">Giờ Việt Nam (UTC+7). ${request ? "Chờ chủ trọ chấp nhận mới có lịch hẹn, chưa giữ chỗ thuê." : "Tạo lịch đã chốt sau khi trao đổi với người thuê."}</p><div class="form-grid"><label class="field">${request ? "Chủ trọ" : "Người thuê"}<input value="${esc(person(request ? ownerId : tenantId).name)}" disabled></label><label class="field">Phòng<select name="roomId" required>${relatedRooms.map((id) => `<option value="${esc(id)}" ${id === selected ? "selected" : ""}>${esc(roomName(id))}</option>`).join("")}</select></label><label class="field">Ngày xem<input type="date" name="date" value="${todayISO(suggested)}" min="${todayISO()}" required></label><label class="field">Giờ bắt đầu<input type="time" name="time" value="${vietnamTime(suggested)}" required></label><label class="field">Thời lượng<select name="duration">${[30,60,90,120].map((n) => `<option value="${n}" ${n === 60 ? "selected" : ""}>${n} phút</option>`).join("")}</select></label><label class="field full">Ghi chú<textarea name="notes" maxlength="2000" placeholder="Địa điểm gặp, mong muốn về giờ xem..."></textarea></label></div><div class="form-actions">${button("Hủy", "close-dialog")}<button type="submit" class="button primary">${request ? "Gửi đề nghị" : "Lưu lịch hẹn"}</button></div></form>`);
}

function openContract(viewingId) {
  if (state.role !== "landlord") return;
  const v = byId(state.viewings, viewingId);
  if (!v || v.status !== "COMPLETED" || v.decision !== "AGREED") { flash("Cần xác nhận đã xem và người thuê đồng ý trước."); return; }
  if (liveViewingContract(viewingId)) { flash("Lịch xem đã có hợp đồng."); return; }
  const r = room(v.roomId);
  const start = todayISO();
  const end = `${Number(start.slice(0, 4)) + 1}${start.slice(4)}`;
  const templates = (state.templates || []).filter((item) => item.active);
  modal("Lập hợp đồng thuê", `<form data-form="create-contract"><input type="hidden" name="viewingId" value="${v.id}"><div class="form-grid"><label class="field">Phòng<input value="${esc(roomName(r.id))}" disabled></label><label class="field">Đại diện<input value="${esc(person(v.tenantId).name)}" disabled></label><label class="field">Bắt đầu<input type="date" name="start" value="${start}" required></label><label class="field">Kết thúc<input type="date" name="end" value="${end}" required></label><label class="field">Giá thuê / tháng<input type="number" name="rent" min="0" value="${r.price}" required></label><label class="field">Tiền cọc<input type="number" name="deposit" min="0" value="${r.deposit}" required></label><label class="field full">Thành viên khác<textarea name="members" placeholder="Mỗi người một dòng: họ tên, số CCCD (nếu có)"></textarea></label><label class="field full">Mẫu hợp đồng<select name="templateId" data-change="contract-template">${templates.map((item) => `<option value="${item.id}">${esc(item.name)} · v${item.version}</option>`).join("")}</select></label><label class="field full">Điều khoản<textarea name="terms" required>${esc(templates[0]?.content || "")}</textarea></label></div><div class="form-actions">${button("Hủy", "close-dialog")}<button type="submit" class="button primary">${icon("send")} Gửi đại diện xác nhận</button></div></form>`);
}

function openFeedback(id) { modal("Yêu cầu sửa hợp đồng", `<form data-form="contract-feedback"><input type="hidden" name="contractId" value="${esc(id)}"><label class="field">Nội dung cần sửa<textarea name="feedback" required placeholder="Ghi rõ điều khoản, thành viên hoặc giá cần chỉnh..."></textarea></label><div class="form-actions">${button("Hủy", "close-dialog")}<button class="button primary" type="submit">Gửi yêu cầu</button></div></form>`); }
function openResend(id) {
  const c = contract(id);
  modal("Chỉnh phiên bản hợp đồng", `<form data-form="resend-contract"><input type="hidden" name="contractId" value="${c.id}"><div class="form-grid"><label class="field">Ngày kết thúc<input type="date" name="end" value="${c.end}" required></label><label class="field">Giá thuê<input type="number" name="rent" min="0" value="${c.rent}" required></label><label class="field full">Điều khoản<textarea name="terms" required>${esc(c.terms)}</textarea></label></div><div class="form-actions">${button("Hủy", "close-dialog")}<button class="button primary" type="submit">${icon("send")} Gửi phiên bản ${c.revisionNo}</button></div></form>`);
}
function openMoveIn(id) {
  const [contractId, memberId] = id.split(":");
  const c = contract(contractId);
  if (!ownsContract(c) || !["CONFIRMED", "ACTIVE"].includes(c.status)) return;
  const planned = c.members.filter((m) => m.status === "PLANNED");
  if (!planned.length) { flash("Không còn thành viên dự kiến vào ở."); return; }
  modal("Xác nhận thành viên vào ở", `<form data-form="move-in"><input type="hidden" name="contractId" value="${c.id}"><p>${esc(roomName(c.roomId))}. Chọn những người đã thực tế chuyển vào. Khi kích hoạt hợp đồng phải có đại diện.</p><div class="stack">${planned.map((m) => `<label class="list-row"><span><input type="checkbox" name="memberIds" value="${esc(m.id)}" ${!memberId || m.id === memberId ? "checked" : ""}> ${esc(m.name)}${representative(c)?.id === m.id ? " (đại diện)" : ""}</span></label>`).join("")}</div><label class="field">Ngày thực tế chuyển vào<input type="date" name="date" value="${todayISO()}" min="${c.start}" max="${todayISO() < c.end ? todayISO() : c.end}" required></label><div class="form-actions">${button("Hủy", "close-dialog")}<button class="button primary" type="submit">Xác nhận những người đã chọn</button></div></form>`);
}
function openChange(id) {
  const c = contract(id);
  if (!c || state.role !== "tenant" || c.tenantId !== userId() || c.status !== "ACTIVE") return;
  const alternatives = state.rooms.filter((r) => r.status === "AVAILABLE" && r.id !== c.roomId && house(r.houseId).ownerId === c.ownerId);
  modal("Đề nghị điều chỉnh", `<form data-form="change-request"><input type="hidden" name="contractId" value="${c.id}"><div class="form-grid"><label class="field">Loại yêu cầu<select name="type" data-change="change-type"><option value="RENEWAL">Gia hạn</option><option value="TERMINATION">Kết thúc</option><option value="TRANSFER">Đổi phòng</option></select></label><label class="field">Ngày hiệu lực<input type="date" name="effective" value="${c.end}" required></label><label class="field full" id="transfer-target" hidden>Phòng muốn chuyển<select name="targetRoom">${alternatives.map((r) => `<option value="${r.id}">${esc(roomName(r.id))}</option>`).join("")}</select></label><label class="field full">Nội dung<textarea name="note" required placeholder="Nêu đề nghị của bạn..."></textarea></label></div><div class="form-actions">${button("Hủy", "close-dialog")}<button class="button primary" type="submit">Gửi đề nghị</button></div></form>`);
}
function openReviewChange(id) {
  const x = byId(state.changeRequests, id);
  modal("Xử lý yêu cầu điều chỉnh", `<div class="stack"><div class="list-row"><div><strong>${esc(x.type)}</strong><small>${esc(x.note)}</small></div></div><div class="list-row"><div><strong>Ngày hiệu lực</strong><small>${dateLabel(x.effective)}</small></div></div></div><div class="form-actions">${button("Từ chối", "reject-change", id, "danger")}${button("Chấp thuận", "approve-change", id, "primary")}</div>`);
}

function openService(id = "") {
  const item = id ? byId(state.services, id) : null;
  modal(item ? "Sửa dịch vụ" : "Thêm dịch vụ", `<form data-form="service"><input type="hidden" name="serviceId" value="${esc(id)}"><div class="form-grid"><label class="field full">Tên dịch vụ<input name="name" value="${esc(item?.name || "")}" required maxlength="100"></label><label class="field">Đơn vị<input name="unit" value="${esc(item?.unit || "")}" placeholder="kWh, m³, phòng..." required></label><label class="field">Giá mặc định<input type="number" name="price" value="${item?.price ?? 0}" min="0" required></label><label class="field full">Cách tính<select name="method">${[["METERED", "Theo đồng hồ"], ["PER_PERSON", "Theo người"], ["PER_ROOM", "Theo phòng"]].map(([v, label]) => `<option value="${v}" ${item?.method === v ? "selected" : ""}>${label}</option>`).join("")}</select></label></div><div class="form-actions">${button("Hủy", "close-dialog")}<button class="button primary" type="submit">Lưu dịch vụ</button></div></form>`);
}
function openOverride(id) {
  const item = state.roomServices.find((x) => x.roomId === state.roomSelection && x.serviceId === id);
  const s = byId(state.services, id);
  modal("Giá riêng cho phòng", `<form data-form="override-service"><input type="hidden" name="serviceId" value="${id}"><p>${esc(s.name)} · ${esc(roomName(state.roomSelection))}</p><label class="field">Giá riêng, để trống để kế thừa giá nhà<input type="number" name="price" min="0" value="${item?.override ?? ""}" placeholder="${s.price}"></label><div class="form-actions">${button("Hủy", "close-dialog")}<button type="submit" class="button primary">Lưu giá</button></div></form>`);
}
function openRoom(id = "") {
  const r = id ? room(id) : null;
  modal(r ? "Sửa phòng" : "Thêm phòng", `<form data-form="room"><input type="hidden" name="roomId" value="${esc(id)}"><div class="form-grid"><label class="field">Mã phòng<input name="code" value="${esc(r?.code || "")}" required></label><label class="field">Diện tích m²<input type="number" name="area" min="1" step="0.1" value="${r?.area || ""}" required></label><label class="field">Giá thuê<input type="number" name="price" min="0" value="${r?.price || ""}" required></label><label class="field">Tiền cọc<input type="number" name="deposit" min="0" value="${r?.deposit || ""}" required></label><label class="field">Tối đa người<input type="number" name="capacity" min="1" value="${r?.capacity || 2}" required></label><label class="field">Trạng thái<select name="status">${[["AVAILABLE", "Còn phòng"], ["RESERVED", "Đã giữ"], ["OCCUPIED", "Đang ở"], ["MAINTENANCE", "Bảo trì"]].map(([v, label]) => `<option value="${v}" ${r?.status === v ? "selected" : ""}>${label}</option>`).join("")}</select></label></div><div class="form-actions">${button("Hủy", "close-dialog")}<button class="button primary" type="submit">Lưu phòng</button></div></form>`);
}
function openListing(id = "") {
  if (state.role !== "landlord") return;
  const own = state.rooms.filter(ownsListingRoom);
  if (!own.length) { modal("Chưa có phòng để đăng tin", '<p>Bạn chưa có phòng nào trong nhà trọ của mình. Hãy thêm phòng ở mục Nhà &amp; phòng trước khi đăng tin.</p><div class="form-actions">' + button("Đóng", "close-dialog") + "</div>"); return; }
  if (id && !ownsListingRoom(room(id))) { flash("Bạn chỉ được sửa tin của phòng thuộc nhà trọ mình quản lý."); return; }
  const available = id ? [room(id)] : own.filter(canSubmitNewListing);
  if (!available.length) {
    modal("Các phòng đã có tin đăng", `<p>${own.length} phòng của bạn đều đã có tin đang chờ duyệt hoặc đã duyệt. Chọn tin hiện có để chỉnh sửa; không cần tạo thêm phòng.</p><div class="stack">${own.map((r) => `<div class="list-row"><div><strong>${esc(roomName(r.id))}</strong><small>${POST_LABEL[r.postStatus]?.[0] || "Đã có tin"}</small></div>${button("Sửa tin hiện có", "edit-listing", r.id, "small")}</div>`).join("")}</div><div class="form-actions">${button("Đóng", "close-dialog")}</div>`); return;
  }
  const r = available[0];
  modal(id ? "Sửa tin đăng" : "Tạo hoặc gửi lại tin đăng", `<form data-form="listing"><input type="hidden" name="listingMode" value="${id ? "EDIT" : "CREATE"}"><input type="hidden" name="editingRoomId" value="${esc(id)}"><input type="hidden" name="originalPostStatus" value="${esc(r.postStatus || "NONE")}"><p class="muted tiny">Mỗi phòng có tối đa một tin đang chờ duyệt hoặc đã duyệt. Phòng đã có tin được chỉnh sửa từ danh sách tin hiện có.</p><div class="form-grid"><label class="field full">Phòng${id ? `<input type="hidden" name="roomId" value="${esc(r.id)}"><input value="${esc(roomName(r.id))}" disabled>` : `<select name="roomId" data-change="listing-room" required>${available.map((item) => `<option value="${esc(item.id)}">${esc(roomName(item.id))} · ${POST_LABEL[item.postStatus || "NONE"]?.[0] || "Chưa đăng tin"}</option>`).join("")}</select>`}</label><label class="field full">Tiêu đề<input name="title" value="${esc(r.title)}" required maxlength="200"></label><label class="field full">Nội dung<textarea name="description" required>${esc(r.description)}</textarea></label><label class="field full">Ảnh phòng<input name="photo" type="text" value="${esc(r.photo)}" placeholder="https://..." required maxlength="2000"><small class="muted tiny">Nhập URL ảnh HTTP/HTTPS hoặc giữ nguyên ảnh mẫu.</small></label></div><div class="form-actions">${button("Hủy", "close-dialog")}<button class="button primary" type="submit">Gửi duyệt tin</button></div></form>`);
}

function openInvoice(id = "") {
  const invoice = id ? byId(state.invoices, id) : null;
  const active = state.contracts.filter((c) => c.ownerId === "quan" && c.status === "ACTIVE");
  const selected = contract(invoice?.contractId || state.invoiceContractSelection) || active[0];
  if (!selected || !active.length) { flash("Cần có hợp đồng đang ở để lập hóa đơn."); return; }
  state.invoiceContractSelection = selected.id;
  const period = invoice?.period || `${todayISO().slice(0, 7)}-01`;
  const due = invoice?.due || `${todayISO().slice(0, 7)}-28`;
  const activeCount = selected.members.filter((m) => m.status === "ACTIVE").length;
  const applied = state.roomServices.filter((item) => item.roomId === selected.roomId && item.active).map((item) => ({ ...item, service: byId(state.services, item.serviceId) })).filter((item) => item.service?.active);
  const serviceFields = applied.map((entry) => {
    const s = entry.service;
    const previous = invoice?.items.find((x) => x.serviceId === s.id);
    const price = entry.override ?? s.price;
    if (s.method === "METERED") return `<div class="field full"><strong>${esc(s.name)} · ${money(price)}/${esc(s.unit)}</strong></div><label class="field">Chỉ số đầu<input type="number" name="prev-${s.id}" min="0" step="0.001" value="${previous?.previousReading ?? 0}" required></label><label class="field">Chỉ số cuối<input type="number" name="current-${s.id}" min="0" step="0.001" value="${previous?.currentReading ?? 0}" required></label>`;
    const quantity = s.method === "PER_ROOM" ? 1 : activeCount;
    return `<div class="field full"><strong>${esc(s.name)}</strong><span>${quantity} ${esc(s.unit)} × ${money(price)}</span></div>`;
  }).join("");
  modal(invoice ? "Sửa hóa đơn nháp" : "Lập hóa đơn", `<form data-form="invoice"><input type="hidden" name="invoiceId" value="${esc(id)}"><div class="form-grid"><label class="field full">Hợp đồng<select name="contractId" data-change="invoice-contract" ${invoice ? "disabled" : ""}>${active.map((c) => `<option value="${c.id}" ${c.id === selected.id ? "selected" : ""}>${esc(c.number)} · ${esc(roomName(c.roomId))}</option>`).join("")}</select></label><label class="field">Kỳ thu<input type="month" name="period" value="${period.slice(0, 7)}" required></label><label class="field">Hạn thanh toán<input type="date" name="due" value="${due}" required></label><div class="field full"><strong>Tiền phòng</strong><span>${money(selected.rent)} / tháng · ${activeCount} người đang ở</span></div>${serviceFields}<label class="field">Khoản khác<input type="number" name="other" min="0" value="${invoice?.items.find((x) => x.type === "OTHER")?.price || 0}"></label><label class="field">Giảm trừ<input type="number" name="discount" min="0" value="${invoice?.items.find((x) => x.type === "DISCOUNT")?.price || 0}"></label></div><div class="form-actions">${button("Hủy", "close-dialog")}<button class="button primary" type="submit">Lưu bản nháp</button></div></form>`);
}

function openReportPost(id) { modal("Báo cáo tin đăng", `<form data-form="report-post"><input type="hidden" name="roomId" value="${esc(id)}"><p>${esc(room(id).title)}</p><label class="field">Lý do<textarea name="reason" required placeholder="Mô tả nội dung cần kiểm tra..."></textarea></label><div class="form-actions">${button("Hủy", "close-dialog")}<button class="button primary" type="submit">Gửi báo cáo</button></div></form>`); }
function openResolveReport(id) { modal("Xử lý báo cáo", `<form data-form="resolve-report"><input type="hidden" name="reportId" value="${esc(id)}"><label class="field">Kết luận<textarea name="resolution" required></textarea></label><div class="form-actions">${button("Hủy", "close-dialog")}<button class="button primary" type="submit">Lưu kết luận</button></div></form>`); }
function openReview(id) { modal("Đánh giá phòng", `<form data-form="review"><input type="hidden" name="contractId" value="${esc(id)}"><div class="form-grid"><label class="field">Số sao<select name="rating">${[5, 4, 3, 2, 1].map((n) => `<option value="${n}">${n} sao</option>`).join("")}</select></label><label class="field full">Nhận xét<textarea name="content" required placeholder="Trải nghiệm thực tế của bạn..."></textarea></label></div><div class="form-actions">${button("Hủy", "close-dialog")}<button class="button primary" type="submit">Đăng đánh giá</button></div></form>`); }
function openIdentity() { modal("Gửi hồ sơ căn cước", `<form data-form="identity"><div class="form-grid"><label class="field full">Số căn cước<input name="identity" inputmode="numeric" required maxlength="30"></label><label class="field full">Ảnh giấy tờ<input type="file" name="document" accept="image/*,.pdf" required></label></div><div class="form-actions">${button("Hủy", "close-dialog")}<button class="button primary" type="submit">Gửi kiểm duyệt</button></div></form>`); }
function editRoommateProfile() {
  const p = state.roommateProfile || seed.roommateProfile;
  modal("Tiêu chí ở ghép", `<form data-form="roommate-profile"><div class="form-grid"><label class="field full">Khu vực mong muốn<input name="location" value="${esc(p.location)}" required></label><label class="field">Ngân sách từ<input type="number" name="budgetMin" min="0" value="${p.budgetMin}" required></label><label class="field">Đến<input type="number" name="budgetMax" min="0" value="${p.budgetMax}" required></label><label class="field full">Thói quen / yêu cầu<textarea name="habits" required>${esc(p.habits)}</textarea></label><label class="field full">Sẵn sàng từ<input type="date" name="available" value="${p.available}" required></label></div><div class="form-actions">${button("Hủy", "close-dialog")}<button class="button primary" type="submit">Lưu hồ sơ</button></div></form>`);
}
function openNotifications() {
  const list = state.notifications.filter((n) => n.userId === userId());
  modal("Thông báo", `<div class="stack">${list.length ? list.map((n) => `<div class="list-row"><div><strong>${esc(n.text)}</strong><small>${n.read ? "Đã đọc" : "Chưa đọc"}</small></div>${!n.read ? button("Đã đọc", "read-notification", n.id, "small") : ""}</div>`).join("") : `<div class="muted tiny">Không có thông báo.</div>`}</div>`);
}

function openTemplate() {
  modal("Tạo phiên bản mẫu", `<form data-form="template"><div class="form-grid"><label class="field full">Tên mẫu<input name="name" list="template-names" required maxlength="100"><datalist id="template-names">${[...new Set((state.templates || []).map((x) => x.name))].map((x) => `<option value="${esc(x)}"></option>`).join("")}</datalist></label><label class="field full">Nội dung mẫu<textarea name="content" required></textarea></label></div><div class="form-actions">${button("Hủy", "close-dialog")}<button type="submit" class="button primary">Lưu phiên bản mới</button></div></form>`);
}
function openModerationReason(kind, id) {
  const title = kind === "reject-listing" ? "Từ chối tin đăng" : kind === "reject-verification" ? "Từ chối hồ sơ" : (state.lockedUsers || []).includes(id) ? "Mở khóa tài khoản" : "Khóa tài khoản";
  modal(title, `<form data-form="moderation-reason"><input type="hidden" name="kind" value="${kind}"><input type="hidden" name="targetId" value="${esc(id)}"><label class="field">Lý do<textarea name="reason" required></textarea></label><div class="form-actions">${button("Hủy", "close-dialog")}<button type="submit" class="button primary">Xác nhận</button></div></form>`);
}
function logAudit(action, target, reason) {
  state.audit ||= [];
  state.audit.push({ id: `audit${Date.now()}`, actorId: "admin", action, target, reason, date: todayISO() });
}

function finish(message) { closeDialog(); save(); render(); if (message) flash(message); }

function handleAction(action, id) {
  let item;
  switch (action) {
    case "navigate": changeView(id); return;
    case "switch-role": switchRole(id); return;
    case "close-dialog": closeDialog(); return;
    case "notifications": openNotifications(); return;
    case "read-notification": item = byId(state.notifications, id); if (item) item.read = true; save(); openNotifications(); renderShell(); refreshIcons(); return;
    case "favorite": state.favorites = state.favorites.includes(id) ? state.favorites.filter((x) => x !== id) : [...state.favorites, id]; finish(state.favorites.includes(id) ? "Đã lưu tin đăng." : "Đã bỏ lưu tin đăng."); return;
    case "clear-filters": state.filters = structuredClone(seed.filters); finish("Đã xóa bộ lọc."); return;
    case "room-detail": state.sharedPostReturn = null; state.selectedRoom = id; state.view = "detail"; save(); render(); window.scrollTo(0, 0); return;
    case "share-post": openSharePost(id); return;
    case "shared-post-detail": {
      const c = visibleConversations().find((x) => x.type === "ROOMMATE" && x.messages.some((m) => m.id === id && m.messageType === "POST_SHARE"));
      const message = c?.messages.find((m) => m.id === id);
      if (!message || !shareablePost(message.sharedPostId)) { flash("Tin phòng không còn hiển thị."); return; }
      state.sharedPostReturn = c.id; state.selectedRoom = message.sharedPostId; state.view = "detail"; save(); render(); window.scrollTo(0, 0); return;
    }
    case "return-shared-chat": {
      const c = visibleConversations().find((x) => x.id === id && x.type === "ROOMMATE");
      if (c) { state.sharedPostReturn = null; openRoommateChat(c.roommateRequestId); } return;
    }
    case "chat-room": {
      if (state.role !== "tenant") return;
      const owner = house(room(id).houseId).ownerId;
      let c = state.conversations.find((x) => x.users.includes("lan") && x.users.includes(owner));
      if (!c) { c = { id: `c${Date.now()}`, users: ["lan", owner], messages: [] }; state.conversations.push(c); }
      c.roomIds = [...new Set([...(c.roomIds || []), id])];
      state.selectedConversation = c.id; state.chatContext = id; state.chatContexts[chatDraftKey(c.id)] = id;
      state.chatMobileOpen = true; state.view = "chats"; save(); render(); return;
    }
    case "select-chat": {
      const c = visibleConversations().find((item) => item.id === id);
      if (!c) return;
      state.selectedConversation = id;
      state.chatContext = Object.hasOwn(state.chatContexts, chatDraftKey(c.id)) ? state.chatContexts[chatDraftKey(c.id)] : c.messages[c.messages.length - 1]?.roomId || null;
      state.chatMobileOpen = true; save(); render(); return;
    }
    case "back-chats": state.chatMobileOpen = false; save(); render(); return;
    case "select-context": selectChatContext(id); return;
    case "clear-context": selectChatContext(null); return;
    case "tab": state.tab = id; save(); render(); return;
    case "open-appointment": openAppointment(); return;
    case "open-viewing-request": openAppointment("REQUEST", id); return;
    case "accept-viewing-proposal": acceptViewingProposal(id); return;
    case "reject-viewing-proposal": {
      expireViewingProposals(); item = byId(state.viewingProposals, id);
      if (state.role !== "landlord" || item?.ownerId !== userId() || item.status !== "PENDING" || (state.lockedUsers || []).includes(userId())) return;
      modal("Từ chối đề nghị xem phòng", `<form data-form="reject-viewing-proposal"><input type="hidden" name="proposalId" value="${esc(id)}"><label class="field">Lý do từ chối<textarea name="reason" required maxlength="1000"></textarea></label><div class="form-actions">${button("Quay lại", "close-dialog")}<button type="submit" class="button danger">Từ chối</button></div></form>`); return;
    }
    case "withdraw-viewing-proposal": {
      expireViewingProposals(); item = byId(state.viewingProposals, id);
      if (state.role !== "tenant" || item?.tenantId !== userId() || item.status !== "PENDING" || (state.lockedUsers || []).includes(userId())) return;
      Object.assign(item, { status: "WITHDRAWN", withdrawnBy: userId(), withdrawnAt: new Date().toISOString() });
      notifyViewingProposal(item, item.ownerId, "Người thuê đã rút đề nghị xem phòng."); finish("Đã rút đề nghị."); return;
    }
    case "confirm-attendance":
    case "no-show": {
      item = byId(state.viewings, id);
      if (!item || item.status !== "SCHEDULED" || state.role !== "landlord" || item.ownerId !== userId()) return;
      if (Date.now() < (action === "no-show" ? viewingEnd(item) : viewingStart(item))) { flash(action === "no-show" ? "Chỉ ghi nhận không đến khi đã hết giờ hẹn." : "Chưa đến giờ xem phòng."); return; }
      if (action === "no-show") item.status = "NO_SHOW";
      else { item.status = "COMPLETED"; item.attendanceConfirmedBy = userId(); item.attendanceConfirmedAt = new Date().toISOString(); }
      finish(action === "no-show" ? "Đã ghi nhận người thuê không đến." : "Đã xác nhận người thuê đến xem."); return;
    }
    case "cancel-viewing": {
      item = byId(state.viewings, id);
      if (!item || item.status !== "SCHEDULED" || ![item.ownerId, item.tenantId].includes(userId())) return;
      modal("Hủy lịch xem phòng", `<form data-form="cancel-viewing"><input type="hidden" name="viewingId" value="${item.id}"><label class="field">Lý do hủy<textarea name="reason" required maxlength="1000"></textarea></label><div class="form-actions">${button("Quay lại", "close-dialog")}<button type="submit" class="button danger">Xác nhận hủy lịch</button></div></form>`); return;
    }
    case "agree-rent":
    case "decline-rent":
    case "withdraw-rent": {
      item = byId(state.viewings, id);
      if (!item || item.status !== "COMPLETED" || state.role !== "tenant" || item.tenantId !== userId()) return;
      if (action === "withdraw-rent") {
        if (item.decision !== "AGREED") return;
        if (liveViewingContract(item.id)) { flash("Cần chủ trọ hủy hoặc kết thúc hợp đồng liên quan trước khi rút ý định thuê."); return; }
        item.decision = "WITHDRAWN"; item.rentalWithdrawnAt = new Date().toISOString();
      } else {
        if (item.decision !== "WAITING") return;
        item.decision = action === "agree-rent" ? "AGREED" : "DECLINED";
        item.rentalDecidedBy = userId(); item.rentalDecidedAt = new Date().toISOString();
      }
      finish(action === "withdraw-rent" ? "Đã rút ý định thuê." : action === "agree-rent" ? "Đã đồng ý thuê. Chủ trọ có thể lập hợp đồng." : "Đã lưu quyết định không thuê."); return;
    }
    case "cancel-contract": {
      item = contract(id);
      if (!ownsContract(item) || !["DRAFT", "PENDING_CONFIRMATION", "CONFIRMED"].includes(item.status)) return;
      modal("Hủy hợp đồng chưa vào ở", `<form data-form="cancel-contract"><input type="hidden" name="contractId" value="${item.id}"><label class="field">Lý do hủy<textarea name="reason" required maxlength="1000"></textarea></label><div class="form-actions">${button("Quay lại", "close-dialog")}<button type="submit" class="button danger">Xác nhận hủy hợp đồng</button></div></form>`); return;
    }
    case "open-contract": openContract(id); return;
    case "contract-detail": state.selectedContract = id; state.view = "contracts"; save(); render(); return;
    case "representative-history": openRepresentativeHistory(id); return;
    case "open-feedback": openFeedback(id); return;
    case "confirm-contract": {
      item = contract(id); if (!item || item.status !== "PENDING_CONFIRMATION" || item.tenantId !== userId()) return;
      item.status = "CONFIRMED"; item.revisionStatus = "CONFIRMED"; item.revisions[item.revisions.length - 1].status = "CONFIRMED";
      finish("Đã xác nhận phiên bản hợp đồng. Chờ chủ trọ xác nhận vào ở."); return;
    }
    case "open-resend": openResend(id); return;
    case "confirm-move-in": openMoveIn(id); return;
    case "open-change": openChange(id); return;
    case "review-change": openReviewChange(id); return;
    case "approve-change": item = byId(state.changeRequests, id); if (item?.status === "PENDING") { item.status = "APPROVED_WAITING_CONFIRMATION"; finish("Đã gửi phương án cho đại diện xác nhận."); } return;
    case "reject-change": item = byId(state.changeRequests, id); if (item?.status === "PENDING") { item.status = "REJECTED"; finish("Đã từ chối đề nghị."); } return;
    case "accept-change": item = byId(state.changeRequests, id); if (item?.status === "APPROVED_WAITING_CONFIRMATION" && state.role === "tenant" && contract(item.contractId)?.tenantId === userId() && item.requestedBy === userId()) { item.status = "READY_TO_APPLY"; finish("Đã xác nhận phương án điều chỉnh."); } return;
    case "apply-change": applyChange(id); return;
    case "open-room": openRoom(); return;
    case "edit-room": openRoom(id); return;
    case "open-service": openService(); return;
    case "edit-service": openService(id); return;
    case "toggle-service": item = byId(state.services, id); if (item) { item.active = !item.active; finish(item.active ? "Đã bật dịch vụ." : "Đã ngừng dịch vụ. Hóa đơn cũ được giữ nguyên."); } return;
    case "override-service": openOverride(id); return;
    case "open-listing": openListing(); return;
    case "edit-listing": openListing(id); return;
    case "approve-listing": item = room(id); if (item) { item.postStatus = "APPROVED"; logAudit("APPROVE_POST", `Tin đăng ${item.code}`, "Nội dung và hình ảnh hợp lệ"); finish("Tin đã được duyệt."); } return;
    case "reject-listing": openModerationReason("reject-listing", id); return;
    case "restore-listing": item = room(id); if (item) { item.postStatus = "APPROVED"; logAudit("RESTORE_POST", `Tin đăng ${item.code}`, "Đã khắc phục nội dung"); finish("Tin đã hiển thị lại."); } return;
    case "open-template": openTemplate(); return;
    case "toggle-template": item = byId(state.templates, id); if (item) { item.active = !item.active; finish(item.active ? "Đã bật mẫu hợp đồng." : "Đã ngừng dùng mẫu, phiên bản cũ vẫn được giữ."); } return;
    case "export-residents": exportResidents(); return;
    case "approve-join": approveJoin(id); return;
    case "reject-join": item = byId(state.joinRequests, id); if (item?.status === "PENDING_LANDLORD" && ownsContract(contract(item.contractId))) { Object.assign(item, { status: "REJECTED", reviewedBy: userId(), reviewedAt: new Date().toISOString(), rejectionReason: "Chủ trọ từ chối yêu cầu thêm người." }); finish("Đã từ chối yêu cầu thêm người."); } return;
    case "cancel-join": item = byId(state.joinRequests, id); if (item?.status === "APPROVED" && ownsContract(contract(item.contractId))) { item.status = "CANCELLED"; item.cancelledAt = new Date().toISOString(); finish("Đã hủy giữ chỗ."); } return;
    case "cancel-planned": {
      const [contractId, memberId] = id.split(":"); const c = contract(contractId); const member = c?.members.find((m) => m.id === memberId);
      if (!ownsContract(c) || !isLiveContract(c) || member?.status !== "PLANNED") return;
      if (representative(c)?.id === member.id) { flash("Không thể hủy riêng đại diện. Hãy hủy hợp đồng nếu chưa vào ở."); return; }
      member.status = "CANCELLED"; member.cancellationReason = "Không chuyển vào ở."; syncRoomStatus(c.roomId); finish("Đã hủy thành viên dự kiến và trả chỗ."); return;
    }
    case "complete-join": completeJoin(id); return;
    case "move-out": moveOut(id); return;
    case "open-invoice": openInvoice(); return;
    case "edit-invoice": openInvoice(id); return;
    case "invoice-detail": state.selectedInvoice = id; save(); render(); return;
    case "issue-invoice": item = byId(state.invoices, id); if (item?.status === "DRAFT" && item.items.length) { item.status = "UNPAID"; finish("Hóa đơn đã phát hành, các dòng tiền được giữ cố định."); } return;
    case "pay-invoice": item = byId(state.invoices, id); if (item?.status === "UNPAID") { item.status = "PAID"; finish("Đã xác nhận thu tiền."); } return;
    case "cancel-invoice": item = byId(state.invoices, id); if (item?.status === "UNPAID") modal("Hủy hóa đơn", `<form data-form="cancel-invoice"><input type="hidden" name="invoiceId" value="${id}"><label class="field">Lý do hủy<textarea name="reason" required></textarea></label><div class="form-actions">${button("Quay lại", "close-dialog")}<button type="submit" class="button danger">Hủy hóa đơn</button></div></form>`); return;
    case "edit-roommate-profile": editRoommateProfile(); return;
    case "roommate-profile": openRoommateProfile(id); return;
    case "chat-roommate": openRoommateChat(id); return;
    case "send-roommate": {
      if (state.role !== "tenant" || id === userId() || !roommateProfileFor(id)) return;
      const existing = openRoommateInvite(id);
      if (existing?.status === "ACCEPTED") { openRoommateChat(existing.id); return; }
      if (existing) { flash(existing.senderId === userId() ? "Bạn đã gửi lời mời cho người này." : "Người này đã gửi lời mời. Hãy xem hồ sơ và phản hồi lời mời hiện có."); return; }
      state.roommateInvites.push({ id: `rm-${userId()}-${id}-${Date.now()}-${state.roommateInvites.length}`, senderId: userId(), receiverId: id, status: "PENDING", scenario: "SEARCH_TOGETHER", note: "Mình muốn kết nối để trò chuyện và tìm hiểu về việc ở ghép." }); finish("Đã gửi lời mời kết nối."); return;
    }
    case "accept-roommate": acceptRoommate(id); return;
    case "reject-roommate": item = byId(state.roommateInvites, id); if (state.role === "tenant" && item?.status === "PENDING" && item.receiverId === userId()) { item.status = "REJECTED"; item.respondedAt = new Date().toISOString(); finish("Đã từ chối lời mời."); } return;
    case "approve-verification": item = byId(state.verifications, id); if (item) { item.status = "APPROVED"; logAudit("APPROVE_VERIFICATION", person(item.userId).name, "Hồ sơ hợp lệ"); finish("Đã duyệt hồ sơ xác minh."); } return;
    case "reject-verification": openModerationReason("reject-verification", id); return;
    case "report-post": openReportPost(id); return;
    case "resolve-report": openResolveReport(id); return;
    case "toggle-user": openModerationReason("toggle-user", id); return;
    case "open-review": openReview(id); return;
    case "open-identity": openIdentity(); return;
    case "revoke-session": flash("Đã thu hồi phiên đăng nhập."); return;
    default: flash("Thao tác chưa có trong bản mô phỏng.");
  }
}

function applyChange(id) {
  const request = byId(state.changeRequests, id);
  if (!request || request.status !== "READY_TO_APPLY") return;
  if (request.effective > todayISO()) { flash("Chưa đến ngày hiệu lực của thay đổi."); return; }
  const c = contract(request.contractId);
  if (!ownsContract(c) || c.status !== "ACTIVE") { flash("Chỉ áp dụng thay đổi cho hợp đồng đang hoạt động."); return; }
  if (request.effective < c.start || c.members.some((m) => m.status === "ACTIVE" && m.moveIn > request.effective)) { flash("Ngày hiệu lực không được trước ngày vào ở của thành viên."); return; }
  if (request.type === "RENEWAL") {
    const newEnd = `${Number(c.end.slice(0, 4)) + 1}${c.end.slice(4)}`;
    c.end = newEnd; c.revisionNo += 1; c.revisions.push({ version: c.revisionNo, status: "CONFIRMED" });
  } else if (request.type === "TERMINATION") {
    closeStays(c, request.effective, "Kết thúc hợp đồng theo thỏa thuận."); c.status = "TERMINATED"; syncRoomStatus(c.roomId);
  } else if (request.type === "TRANSFER") {
    const target = room(request.targetRoomId);
    if (!target || target.id === c.roomId || house(target.houseId).ownerId !== c.ownerId || target.status !== "AVAILABLE" || hasLiveRoomContract(target.id) || roomLoad(target.id) > 0) { flash("Phòng đích không còn trống hoặc không thuộc chủ trọ."); return; }
    const moving = c.members.filter((m) => ["ACTIVE", "PLANNED"].includes(m.status));
    if (moving.length > target.capacity) { flash("Phòng đích không đủ sức chứa cho toàn bộ thành viên. Chưa thay đổi hợp đồng nguồn."); return; }
    const rep = representative(c);
    if (!rep || !moving.includes(rep)) { flash("Hợp đồng nguồn thiếu đại diện hợp lệ."); return; }
    const transferMembers = moving.map((m, index) => ({ id: `o${Date.now()}-${index}`, tenantId: m.tenantId, name: m.name, identity: m.identity, dob: m.dob, status: "PLANNED", intakeSource: "TRANSFER", plannedMoveIn: request.effective, moveIn: "", moveOut: "" }));
    const next = { id: `k${Date.now()}`, number: `HD-${todayISO().slice(0, 4)}-${String(100 + state.contracts.length).padStart(3, "0")}`, roomId: target.id, ownerId: c.ownerId, tenantId: c.tenantId, representativeId: transferMembers[moving.indexOf(rep)].id, source: "TRANSFER", previousContractId: c.id, viewingId: null, status: "CONFIRMED", start: request.effective, end: `${Number(request.effective.slice(0, 4)) + 1}${request.effective.slice(4)}`, rent: target.price, deposit: target.deposit, terms: c.terms, revisionNo: 1, revisionStatus: "CONFIRMED", revisions: [{ version: 1, status: "CONFIRMED" }], members: transferMembers };
    next.representativeSinceAt = new Date().toISOString(); ensureRepresentativeHistory(next);
    closeStays(c, request.effective, "Chuyển sang hợp đồng phòng mới."); c.status = "TERMINATED";
    state.contracts.push(next); request.resultContractId = next.id;
    syncRoomStatus(c.roomId); syncRoomStatus(target.id); state.selectedContract = next.id;
  }
  request.status = "COMPLETED"; request.appliedAt = new Date().toISOString(); request.appliedBy = userId(); finish("Đã áp dụng thay đổi hợp đồng.");
}

function approveJoin(id) {
  expireJoinHolds();
  const join = byId(state.joinRequests, id);
  const c = join && contract(join.contractId);
  if (!join || !ownsContract(c) || join.status !== "PENDING_LANDLORD" || !join.representativeConsent || !join.applicantConsent) return;
  if (c.status !== "ACTIVE" || representative(c)?.status !== "ACTIVE" || todayISO() < c.start || todayISO() > c.end || join.date > c.end) { flash("Hợp đồng không còn cho phép thêm người."); return; }
  if (roomLoad(c.roomId) >= room(c.roomId).capacity) { flash("Phòng đã đủ người, gồm cả thành viên dự kiến và chỗ đang giữ."); return; }
  if (c.members.some((m) => m.tenantId === join.applicantId && ["PLANNED", "ACTIVE"].includes(m.status)) || hasActiveAccount(join.applicantId)) { flash("Người này đã có lượt ở đang mở."); return; }
  if (state.joinRequests.some((j) => j.id !== join.id && j.contractId === c.id && j.applicantId === join.applicantId && ["PENDING_CONSENT", "PENDING_LANDLORD", "APPROVED"].includes(j.status))) { flash("Đã có yêu cầu đang mở của người này."); return; }
  Object.assign(join, { status: "APPROVED", reviewedBy: userId(), reviewedAt: new Date().toISOString(), holdExpiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString() });
  finish("Đã giữ một chỗ trong 48 giờ. Cần xác nhận thực tế vào ở trước khi hết hạn.");
}
function completeJoin(id) {
  expireJoinHolds();
  const join = byId(state.joinRequests, id);
  const c = join && contract(join.contractId);
  if (!join || !ownsContract(c) || join.status !== "APPROVED") return;
  if (c.status !== "ACTIVE" || representative(c)?.status !== "ACTIVE" || todayISO() < c.start || todayISO() > c.end) { flash("Hợp đồng không còn hoạt động hoặc đã ngoài thời hạn. Không thể xác nhận vào ở."); return; }
  if (join.date > todayISO()) { flash("Chưa đến ngày dự kiến vào ở."); return; }
  if (roomLoad(c.roomId, join.id) + 1 > room(c.roomId).capacity) { flash("Phòng đã đủ sức chứa, gồm cả chỗ đã giữ."); return; }
  if (hasActiveAccount(join.applicantId) || c.members.some((m) => m.tenantId === join.applicantId && ["PLANNED", "ACTIVE"].includes(m.status))) { flash("Người này đã có lượt ở đang mở."); return; }
  const member = { id: `o${Date.now()}`, tenantId: join.applicantId, name: person(join.applicantId).name, identity: "Chưa cập nhật", dob: "", status: "ACTIVE", intakeSource: "APPROVED_JOIN", joinRequestId: join.id, plannedMoveIn: join.date, moveIn: todayISO(), moveInConfirmedBy: userId(), moveInConfirmedAt: new Date().toISOString() };
  c.members.push(member);
  Object.assign(join, { status: "COMPLETED", completedRoomTenantId: member.id, completedAt: new Date().toISOString() });
  syncRoomStatus(c.roomId); finish("Đã ghi nhận người mới vào ở.");
}
function moveOut(value) {
  const [contractId, memberId] = value.split(":"); const c = contract(contractId); const member = c?.members.find((m) => m.id === memberId);
  if (!ownsContract(c) || !member || member.status !== "ACTIVE") return;
  const remaining = c.members.filter((m) => m.id !== member.id && ["ACTIVE", "PLANNED"].includes(m.status));
  if (representative(c)?.id === member.id && remaining.length) { openRepresentativeHandover(c, member); return; }
  Object.assign(member, { status: "LEFT", moveOut: todayISO(), moveOutConfirmedBy: userId(), moveOutConfirmedAt: new Date().toISOString() });
  if (!remaining.length && isLiveContract(c)) { closeStays(c, todayISO(), "Thành viên cuối cùng đã rời phòng."); c.status = "TERMINATED"; }
  syncRoomStatus(c.roomId);
  finish("Đã ghi nhận ngày rời phòng.");
}
function roommateConversation(invite) {
  let conversation = state.conversations.find((c) => c.type === "ROOMMATE" && c.roommateRequestId === invite.id && c.users.length === 2 && c.users.includes(invite.senderId) && c.users.includes(invite.receiverId));
  if (!conversation) {
    conversation = { id: `c-roommate-${invite.id}`, type: "ROOMMATE", roommateRequestId: invite.id, users: [invite.senderId, invite.receiverId], messages: [] };
    state.conversations.push(conversation);
  }
  return conversation;
}
function openRoommateChat(id) {
  const invite = byId(state.roommateInvites, id);
  if (!acceptedRoommateInvite(invite)) return;
  const conversation = roommateConversation(invite);
  state.selectedConversation = conversation.id;
  state.chatContext = null; state.chatContexts[chatDraftKey(conversation.id)] = null;
  state.chatMobileOpen = true; state.view = "chats"; state.tab = "all"; state.selectedRoom = null;
  closeDialog(); save(); render(); window.scrollTo(0, 0);
}
function acceptRoommate(id) {
  const invite = byId(state.roommateInvites, id);
  if (state.role !== "tenant" || !invite || invite.receiverId !== userId() || invite.senderId === invite.receiverId || invite.endedAt || !["PENDING", "ACCEPTED"].includes(invite.status)) return;
  const timestamp = new Date().toISOString();
  const accepted = state.roommateInvites.find((x) => x.id !== invite.id && x.status === "ACCEPTED" && !x.endedAt && sameRoommatePair(x, invite.senderId, invite.receiverId));
  const connection = accepted || invite;
  if (!accepted && invite.status === "PENDING") { invite.status = "ACCEPTED"; invite.respondedAt = timestamp; }
  // Old demos may contain invitations in both directions. Keep one open connection.
  for (const other of state.roommateInvites) {
    if (other.id !== connection.id && other.status === "PENDING" && sameRoommatePair(other, invite.senderId, invite.receiverId)) {
      other.status = "CANCELLED"; other.respondedAt = timestamp;
    }
  }
  // Connection consent only opens messaging; it never supplies rental consent or reserves a place.
  openRoommateChat(connection.id);
}

function exportResidents() {
  const rows = [["Họ và tên", "Mã phòng", "Nhà trọ", "Địa chỉ", "Số CCCD", "Ngày sinh", "Ngày vào ở"]];
  state.contracts.filter((c) => c.ownerId === "quan").forEach((c) => c.members.filter((m) => m.status === "ACTIVE").forEach((m) => {
    const r = room(c.roomId); rows.push([m.name, r.code, house(r.houseId).name, house(r.houseId).address, m.identity, m.dob, m.moveIn]);
  }));
  const csv = "\ufeff" + rows.map((row) => row.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a"); a.href = url; a.download = `danh-sach-cu-tru-${todayISO()}.csv`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  flash("Đã xuất danh sách người đang ở.");
}

function handleForm(form) {
  expireJoinHolds();
  const name = form.dataset.form;
  const data = new FormData(form);
  const value = (key) => String(data.get(key) ?? "").trim();
  let item;
  switch (name) {
    case "filters": {
      state.filters = { query: value("query"), area: value("area"), maxPrice: value("maxPrice"), minArea: value("minArea"), amenity: value("amenity"), distance: value("distance") };
      save(); render(); return;
    }
    case "share-post": {
      const invite = byId(state.roommateInvites, value("inviteId"));
      const r = shareablePost(value("postId"));
      const note = value("note");
      if (!acceptedRoommateInvite(invite) || !r || note.length > 2000) { flash("Kết nối hoặc tin phòng đã thay đổi. Hãy chọn lại trước khi chia sẻ."); return; }
      const c = roommateConversation(invite);
      c.messages.push({ id: `share-${Date.now()}-${c.messages.length}`, senderId: userId(), messageType: "POST_SHARE", sharedPostId: r.id, roomId: null, text: note, time: vietnamTime(Date.now()) });
      openRoommateChat(invite.id); return;
    }
    case "chat-message": {
      const c = byId(state.conversations, state.selectedConversation);
      const text = value("message");
      if (!c || !c.users.includes(userId()) || !text) return;
      if (text.length > 2000) { flash("Tin nhắn tối đa 2.000 ký tự."); return; }
      if (c.type === "ROOMMATE") {
        const invite = byId(state.roommateInvites, c.roommateRequestId);
        if (!invite || invite.status !== "ACCEPTED" || invite.endedAt || c.users.length !== 2 || !c.users.includes(invite.senderId) || !c.users.includes(invite.receiverId)) { flash("Cần có kết nối được chấp nhận để nhắn tin."); return; }
      }
      const r = c.type === "ROOMMATE" ? null : room(state.chatContext);
      if (r && !c.users.includes(house(r.houseId).ownerId)) { flash("Phòng này không thuộc chủ trọ trong hội thoại."); return; }
      const now = new Date();
      c.messages.push({ id: `m${Date.now()}`, senderId: userId(), roomId: r?.id || null, text, time: now.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) });
      delete state.chatDrafts[chatDraftKey(c.id)];
      save(); render();
      $(".chat-pane-body .message-row:last-of-type")?.scrollIntoView?.({ block: "nearest" });
      $("#chat-message")?.focus({ preventScroll: true }); return;
    }
    case "reject-viewing-proposal": {
      expireViewingProposals();
      const p = byId(state.viewingProposals, value("proposalId"));
      if (state.role !== "landlord" || !p || p.ownerId !== userId() || p.status !== "PENDING" || !value("reason") || value("reason").length > 1000 || (state.lockedUsers || []).includes(userId())) return;
      Object.assign(p, { status: "REJECTED", reviewedBy: userId(), reviewedAt: new Date().toISOString(), rejectionReason: value("reason") });
      notifyViewingProposal(p, p.tenantId, `Chủ trọ từ chối đề nghị xem phòng: ${value("reason")}`); finish("Đã từ chối đề nghị."); return;
    }
    case "viewing-request":
    case "appointment": {
      const request = name === "viewing-request";
      if (request ? state.role !== "tenant" : state.role !== "landlord") return;
      expireViewingProposals();
      const c = byId(state.conversations, value("conversationId")), r = room(value("roomId"));
      const tenantId = request ? userId() : c?.users.find((id) => id !== userId());
      const ownerId = request ? house(r?.houseId)?.ownerId : userId();
      if (!viewingConversationValid(c, r, tenantId, ownerId) || (!request && !tenantExchangedAboutRoom(c, r.id, tenantId))) { flash("Hãy chọn đúng phòng và người thuê trong hội thoại với chủ trọ."); return; }
      const date = value("date"), time = value("time"), notes = value("notes");
      const start = appointmentTimestamp(date, time), end = start + Number(value("duration")) * 60000;
      if (notes.length > 2000) { flash("Ghi chú tối đa 2.000 ký tự."); return; }
      if (request) {
        const key = value("clientRequestKey");
        if (!/^[0-9a-f-]{36}$/i.test(key)) { flash("Hãy mở lại form đề nghị để gửi."); return; }
        const existing = state.viewingProposals.find((p) => p.tenantId === userId() && p.clientRequestKey === key);
        if (existing) {
          if (existing.roomId !== r.id || existing.conversationId !== c.id || viewingStart(existing) !== start || viewingEnd(existing) !== end || existing.notes !== notes) { flash("Mã gửi đã được dùng cho nội dung khác."); return; }
          state.view = "chats"; state.selectedConversation = c.id; state.chatMobileOpen = true; finish("Đề nghị đã được gửi trước đó."); return;
        }
      }
      const error = viewingIntervalError(r, start, end);
      if (error) { flash(error); return; }
      let focusId;
      if (request) {
        if (state.viewingProposals.some((p) => p.tenantId === tenantId && p.roomId === r.id && p.status === "PENDING")) { flash("Bạn đã có đề nghị chờ duyệt cho phòng này. Hãy rút đề nghị cũ trước khi gửi giờ khác."); return; }
        const p = { id: `vp-${Date.now()}-${state.viewingProposals.length}`, roomId: r.id, tenantId, ownerId, conversationId: c.id, clientRequestKey: value("clientRequestKey"), date, time, startsAt: new Date(start).toISOString(), endsAt: new Date(end).toISOString(), notes, status: "PENDING", createdAt: new Date().toISOString() };
        state.viewingProposals.push(p); notifyViewingProposal(p, ownerId, `Có đề nghị xem ${r.code} từ ${person(tenantId).name}.`);
        focusId = `[data-proposal-id="${p.id}"]`; state.view = "chats";
      } else {
        const v = scheduledViewing(c, r, tenantId, ownerId, date, time, start, end, notes);
        state.notifications.push({ id: `n-${v.id}`, userId: tenantId, viewingId: v.id, text: `Chủ trọ đã tạo lịch xem ${r.code} sau khi trao đổi qua tin nhắn.`, read: false });
        focusId = `[data-viewing-id="${v.id}"]`;
        if (state.view !== "chats") state.view = "viewings";
      }
      if (state.view === "chats") { state.selectedConversation = c.id; state.chatMobileOpen = true; }
      finish(request ? "Đã gửi đề nghị, chờ chủ trọ duyệt." : "Đã lưu lịch xem phòng.");
      if (state.view === "chats") $(focusId)?.scrollIntoView?.({ block: "nearest" });
      return;
    }
    case "create-contract": {
      const v = byId(state.viewings, value("viewingId"));
      if (!v || state.role !== "landlord" || v.ownerId !== userId() || v.status !== "COMPLETED" || v.decision !== "AGREED" || liveViewingContract(v.id)) { flash("Chưa đủ điều kiện tạo hợp đồng hoặc lịch xem đã có hợp đồng."); return; }
      if (value("end") < value("start")) { flash("Ngày kết thúc phải sau ngày bắt đầu."); return; }
      if (state.contracts.some((c) => c.roomId === v.roomId && ["PENDING_CONFIRMATION", "CONFIRMED", "ACTIVE"].includes(c.status))) { flash("Phòng đã có hợp đồng còn hiệu lực."); return; }
      const extra = value("members").split("\n").map((line) => line.trim()).filter(Boolean).map((line, index) => { const parts = line.split(",").map((x) => x.trim()); return { id: `o${Date.now()}-${index}`, tenantId: null, name: parts[0], identity: parts[1] || "", dob: "", status: "PLANNED", moveIn: "" }; });
      if (extra.some((m) => !m.name)) { flash("Cần nhập họ tên của từng thành viên."); return; }
      if (room(v.roomId).status !== "AVAILABLE" || roomLoad(v.roomId) + extra.length + 1 > room(v.roomId).capacity) { flash("Phòng không còn trống hoặc số thành viên vượt sức chứa."); return; }
      const number = `HD-${todayISO().slice(0, 4)}-${String(100 + state.contracts.length).padStart(3, "0")}`;
      const c = { id: `k${Date.now()}`, number, roomId: v.roomId, ownerId: v.ownerId, tenantId: v.tenantId, viewingId: v.id, source: "NEW_RENTAL", status: "PENDING_CONFIRMATION", templateId: value("templateId"), revisionNo: 1, revisionStatus: "PENDING_CONFIRMATION", start: value("start"), end: value("end"), rent: Number(value("rent")), deposit: Number(value("deposit")), terms: value("terms"), feedback: "", members: [{ id: `o${Date.now()}`, tenantId: v.tenantId, name: person(v.tenantId).name, identity: "Chưa cập nhật", dob: "", status: "PLANNED", moveIn: "" }, ...extra], revisions: [{ version: 1, status: "PENDING_CONFIRMATION" }] };
      c.representativeId = c.members[0].id;
      c.representativeSinceAt = new Date().toISOString(); ensureRepresentativeHistory(c);
      c.members.forEach((m) => { m.plannedMoveIn = c.start; m.intakeSource = "INITIAL_CONTRACT"; });
      state.contracts.push(c); room(v.roomId).status = "RESERVED"; state.selectedContract = c.id; state.view = "contracts";
      state.notifications.push({ id: `n${Date.now()}`, userId: v.tenantId, text: `Chủ trọ đã gửi hợp đồng ${number} để bạn xác nhận.`, read: false });
      finish("Đã gửi hợp đồng cho đại diện xác nhận."); return;
    }
    case "contract-feedback": {
      const c = contract(value("contractId")); if (!c || c.status !== "PENDING_CONFIRMATION" || state.role !== "tenant" || c.tenantId !== userId()) return;
      c.revisions[c.revisions.length - 1].status = "CANCELLED"; c.revisionNo += 1; c.revisionStatus = "DRAFT"; c.revisions.push({ version: c.revisionNo, status: "DRAFT" }); c.status = "DRAFT"; c.feedback = value("feedback");
      finish("Đã yêu cầu chỉnh sửa. Chủ trọ sẽ gửi phiên bản mới."); return;
    }
    case "resend-contract": {
      const c = contract(value("contractId")); if (!c || c.status !== "DRAFT") return;
      if (value("end") < c.start) { flash("Ngày kết thúc không hợp lệ."); return; }
      c.end = value("end"); c.rent = Number(value("rent")); c.terms = value("terms"); c.status = "PENDING_CONFIRMATION"; c.revisionStatus = "PENDING_CONFIRMATION"; c.revisions[c.revisions.length - 1].status = "PENDING_CONFIRMATION";
      finish("Đã gửi phiên bản mới cho đại diện."); return;
    }
    case "move-in": {
      const c = contract(value("contractId")); const date = value("date");
      if (!ownsContract(c) || !["CONFIRMED", "ACTIVE"].includes(c.status) || !["CONFIRMED", "IMPORTED"].includes(c.revisionStatus)) { flash("Hợp đồng chưa được xác nhận hoặc đã kết thúc."); return; }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < c.start || date > c.end || date > todayISO()) { flash("Ngày vào ở phải nằm trong thời hạn hợp đồng và không ở tương lai."); return; }
      const ids = [...new Set(data.getAll("memberIds").map(String))];
      const selected = ids.map((id) => c.members.find((m) => m.id === id));
      if (!selected.length || selected.some((m) => !m || m.status !== "PLANNED")) { flash("Hãy chọn thành viên dự kiến thực tế vào ở."); return; }
      const rep = representative(c);
      if (!rep || (c.status === "CONFIRMED" ? !selected.includes(rep) : rep.status !== "ACTIVE")) { flash("Cần xác nhận đại diện vào ở để kích hoạt hợp đồng."); return; }
      if (roomLoad(c.roomId) > room(c.roomId).capacity) { flash("Tổng người ở và chỗ đã giữ vượt sức chứa."); return; }
      const accounts = selected.map((m) => m.tenantId).filter(Boolean);
      if (new Set(accounts).size !== accounts.length || selected.some((m) => hasActiveAccount(m.tenantId, m.id))) { flash("Có thành viên đã có lượt ở đang hoạt động."); return; }
      selected.forEach((m) => Object.assign(m, { status: "ACTIVE", moveIn: date, moveOut: "", moveInConfirmedBy: userId(), moveInConfirmedAt: new Date().toISOString() }));
      if (c.status === "CONFIRMED") c.activatedAt = new Date().toISOString();
      c.status = "ACTIVE"; syncRoomStatus(c.roomId);
      finish(`Đã ghi nhận ${selected.length} thành viên vào ở.`); return;
    }
    case "representative-handover": {
      const c = contract(value("contractId"));
      const departing = c?.members.find((m) => m.id === value("departingId"));
      if (!ownsContract(c) || c.status !== "ACTIVE" || departing?.status !== "ACTIVE" || representative(c)?.id !== departing.id) { flash("Dữ liệu đại diện đã thay đổi hoặc hợp đồng không còn hoạt động. Hãy tải lại danh sách."); return; }
      const successor = representativeCandidates(c, departing.id).find((m) => m.id === value("successorId"));
      if (!successor || !value("reason") || value("consent") !== "yes") { flash("Cần chọn người đang ở đủ điều kiện, nhập lý do và xác nhận đã có sự đồng ý của người tiếp nhận."); return; }
      const timestamp = new Date().toISOString();
      ensureRepresentativeHistory(c);
      endRepresentativeTenure(c, timestamp);
      const previous = c.representativeHistory[c.representativeHistory.length - 1];
      previous.endReason = value("reason"); previous.endedBy = userId();
      Object.assign(departing, { status: "LEFT", moveOut: todayISO(), moveOutConfirmedBy: userId(), moveOutConfirmedAt: timestamp });
      c.representativeId = successor.id; c.tenantId = successor.tenantId; c.representativeSinceAt = timestamp;
      c.representativeHistory.push({ roomTenantId: successor.id, tenantId: successor.tenantId, nameSnapshot: successor.name, fromAt: timestamp, toAt: null, ended: false, actorId: userId(), previousRoomTenantId: departing.id, reason: value("reason"), recordedAt: timestamp, consentRecordedBy: userId(), consentRecordedAt: timestamp });
      const cancellationReason = "Đổi đại diện hợp đồng; cần tạo lại yêu cầu với đồng thuận của đại diện mới.";
      cancelContractJoins(c, cancellationReason);
      for (const request of state.changeRequests.filter((x) => x.contractId === c.id && ["PENDING", "APPROVED_WAITING_CONFIRMATION", "READY_TO_APPLY"].includes(x.status))) {
        Object.assign(request, { status: "CANCELLED", cancelledAt: timestamp, cancellationReason });
      }
      for (const recipient of new Set([departing.tenantId, successor.tenantId].filter(Boolean))) {
        state.notifications.push({ id: `n${Date.now()}-${recipient}`, userId: recipient, contractId: c.id, text: `Hợp đồng ${c.number}: ${successor.name} tiếp nhận đại diện từ ${departing.name}.`, read: false });
      }
      syncRoomStatus(c.roomId);
      finish(`Đã ghi nhận ${departing.name} rời phòng và bàn giao đại diện cho ${successor.name}.`); return;
    }
    case "cancel-viewing": {
      const v = byId(state.viewings, value("viewingId"));
      if (!v || v.status !== "SCHEDULED" || ![v.ownerId, v.tenantId].includes(userId()) || !value("reason")) return;
      Object.assign(v, { status: "CANCELLED", cancelledBy: userId(), cancelledAt: new Date().toISOString(), cancellationReason: value("reason") });
      finish("Đã hủy lịch xem phòng."); return;
    }
    case "cancel-contract": {
      const c = contract(value("contractId"));
      if (!ownsContract(c) || !["DRAFT", "PENDING_CONFIRMATION", "CONFIRMED"].includes(c.status) || !value("reason")) return;
      if (c.members.some((m) => m.status === "ACTIVE")) { flash("Hợp đồng đã có người ở; cần xử lý kết thúc hợp đồng."); return; }
      closeStays(c, todayISO(), value("reason")); c.status = "CANCELLED";
      c.revisionStatus = "CANCELLED"; c.revisions[c.revisions.length - 1].status = "CANCELLED"; syncRoomStatus(c.roomId);
      finish("Đã hủy hợp đồng và trả chỗ. Người thuê có thể rút ý định thuê."); return;
    }
    case "change-request": {
      const c = contract(value("contractId"));
      if (!c || c.status !== "ACTIVE" || state.role !== "tenant" || c.tenantId !== userId()) return;
      if (state.changeRequests.some((x) => x.contractId === c.id && ["PENDING", "APPROVED_WAITING_CONFIRMATION", "READY_TO_APPLY"].includes(x.status))) { flash("Hợp đồng đang có một yêu cầu chưa hoàn tất."); return; }
      if (value("type") === "TRANSFER" && !room(value("targetRoom"))) { flash("Chọn phòng muốn chuyển."); return; }
      state.changeRequests.push({ id: `chg${Date.now()}`, contractId: c.id, type: value("type"), status: "PENDING", requestedBy: userId(), effective: value("effective"), targetRoomId: value("type") === "TRANSFER" ? value("targetRoom") : null, note: value("note") });
      finish("Đã gửi yêu cầu điều chỉnh cho chủ trọ."); return;
    }
    case "service": {
      const current = byId(state.services, value("serviceId"));
      if (state.services.some((s) => s.houseId === state.houseSelection && s.name.toLocaleLowerCase("vi-VN") === value("name").toLocaleLowerCase("vi-VN") && s.id !== current?.id)) { flash("Nhà này đã có dịch vụ cùng tên."); return; }
      if (current) Object.assign(current, { name: value("name"), unit: value("unit"), price: Number(value("price")), method: value("method") });
      else state.services.push({ id: `s${Date.now()}`, houseId: state.houseSelection, name: value("name"), unit: value("unit"), price: Number(value("price")), method: value("method"), active: true });
      finish("Đã lưu dịch vụ của nhà trọ."); return;
    }
    case "override-service": {
      item = state.roomServices.find((x) => x.roomId === state.roomSelection && x.serviceId === value("serviceId"));
      if (item) { item.override = value("price") === "" ? null : Number(value("price")); finish("Đã cập nhật giá riêng cho phòng."); } return;
    }
    case "room": {
      const current = room(value("roomId"));
      if (state.rooms.some((r) => r.houseId === state.houseSelection && r.code.toLocaleLowerCase("vi-VN") === value("code").toLocaleLowerCase("vi-VN") && r.id !== current?.id)) { flash("Mã phòng đã tồn tại trong nhà này."); return; }
      if (current && state.contracts.some((c) => c.roomId === current.id && c.members.some((m) => m.status === "ACTIVE")) && value("status") !== "OCCUPIED") { flash("Không thể đổi trạng thái phòng đang có người ở."); return; }
      if (!Number.isInteger(Number(value("capacity"))) || Number(value("capacity")) < Math.max(1, current ? roomLoad(current.id) : 0)) { flash("Sức chứa phải là số nguyên và đủ cho người ở, thành viên dự kiến cùng chỗ đang giữ."); return; }
      const attrs = { code: value("code"), area: Number(value("area")), price: Number(value("price")), deposit: Number(value("deposit")), capacity: Number(value("capacity")), status: value("status") };
      if (current) Object.assign(current, attrs);
      else state.rooms.push({ id: `r${Date.now()}`, houseId: state.houseSelection, title: `Phòng ${attrs.code}`, description: "", distance: 0, photo: PHOTO.r6, amenities: [], postStatus: "DRAFT", ...attrs });
      finish("Đã lưu thông tin phòng."); return;
    }
    case "listing": {
      const r = room(value("roomId"));
      if (!ownsListingRoom(r)) { flash("Bạn chỉ được đăng tin cho phòng thuộc nhà trọ mình quản lý."); return; }
      const mode = value("listingMode");
      if ((mode !== "CREATE" && mode !== "EDIT") || (mode === "EDIT" && value("editingRoomId") !== r.id)) { flash("Thông tin tin đăng không hợp lệ. Hãy mở lại form."); return; }
      if (mode === "CREATE" && !canSubmitNewListing(r)) { flash("Phòng này đã có tin đang chờ duyệt hoặc đã duyệt. Hãy sửa tin hiện có."); return; }
      if (value("originalPostStatus") !== (r.postStatus || "NONE")) { flash("Trạng thái tin đã thay đổi. Hãy mở lại form trước khi gửi."); return; }
      const photo = value("photo");
      let validPhoto = /^assets\/r[1-6]\.(png|webp)$/.test(photo);
      try { validPhoto ||= ["http:", "https:"].includes(new URL(photo).protocol); } catch { /* Relative bundled images are checked above. */ }
      if (!value("title") || value("title").length > 200 || !value("description") || !validPhoto) { flash("Cần nhập tiêu đề, nội dung và URL ảnh HTTP/HTTPS hợp lệ hoặc giữ ảnh mẫu."); return; }
      r.title = value("title"); r.description = value("description"); r.photo = photo; r.postStatus = "PENDING_REVIEW";
      state.view = "listings"; finish("Đã gửi tin đăng chờ quản trị duyệt."); return;
    }
    case "template": {
      state.templates ||= [];
      const version = Math.max(0, ...state.templates.filter((x) => x.name === value("name")).map((x) => x.version)) + 1;
      state.templates.push({ id: `tpl${Date.now()}`, name: value("name"), version, content: value("content"), active: true });
      finish(`Đã lưu mẫu phiên bản ${version}.`); return;
    }
    case "invoice": {
      const old = byId(state.invoices, value("invoiceId"));
      const c = contract(old?.contractId || value("contractId") || state.invoiceContractSelection);
      if (!c || c.status !== "ACTIVE") { flash("Hợp đồng chưa hoạt động."); return; }
      const period = `${value("period")}-01`;
      if (!old && state.invoices.some((i) => i.contractId === c.id && i.period === period && i.status !== "CANCELLED")) { flash("Kỳ này đã có hóa đơn chưa hủy."); return; }
      const activeCount = c.members.filter((m) => m.status === "ACTIVE").length;
      const items = [{ type: "RENT", name: "Tiền phòng", unit: "tháng", quantity: 1, price: c.rent }];
      for (const x of state.roomServices.filter((entry) => entry.roomId === c.roomId && entry.active)) {
        const s = byId(state.services, x.serviceId);
        if (!s?.active) continue;
        let quantity = s.method === "PER_ROOM" ? 1 : activeCount;
        let previousReading = null, currentReading = null;
        if (s.method === "METERED") {
          previousReading = Number(value(`prev-${s.id}`));
          currentReading = Number(value(`current-${s.id}`));
          if (currentReading < previousReading) { flash(`Chỉ số cuối của ${s.name} phải lớn hơn chỉ số đầu.`); return; }
          quantity = currentReading - previousReading;
        }
        items.push({ type: "SERVICE", serviceId: s.id, name: s.name, unit: s.unit, quantity, price: x.override ?? s.price, method: s.method, previousReading, currentReading });
      }
      if (Number(value("other")) > 0) items.push({ type: "OTHER", name: "Khoản khác", unit: "lần", quantity: 1, price: Number(value("other")) });
      if (Number(value("discount")) > 0) items.push({ type: "DISCOUNT", name: "Giảm trừ", unit: "lần", quantity: 1, price: Number(value("discount")) });
      const draft = old || { id: `i${Date.now()}`, code: `INV-${value("period")}-${String(100 + state.invoices.length).padStart(3, "0")}`, contractId: c.id, payerId: c.tenantId, status: "DRAFT" };
      Object.assign(draft, { period, due: value("due"), items });
      if (totalInvoice(draft) < 0) { flash("Giảm trừ không được lớn hơn tổng tiền."); return; }
      if (!old) state.invoices.push(draft);
      state.selectedInvoice = draft.id; state.view = "invoices"; finish("Đã lưu bản nháp hóa đơn."); return;
    }
    case "cancel-invoice": item = byId(state.invoices, value("invoiceId")); if (item?.status === "UNPAID") { item.status = "CANCELLED"; item.cancellationReason = value("reason"); finish("Đã hủy hóa đơn, dữ liệu lịch sử được giữ lại."); } return;
    case "report-post": {
      const r = room(value("roomId")); if (!r) return;
      state.reports.push({ id: `rep${Date.now()}`, from: userId(), target: `Tin đăng ${r.code}`, roomId: r.id, reason: value("reason"), status: "PENDING", date: todayISO() });
      finish("Đã gửi báo cáo cho quản trị."); return;
    }
    case "resolve-report": item = byId(state.reports, value("reportId")); if (item) { item.status = "RESOLVED"; item.resolution = value("resolution"); logAudit("RESOLVE_REPORT", item.target, item.resolution); finish("Đã lưu kết luận báo cáo."); } return;
    case "moderation-reason": {
      const kind = value("kind"), targetId = value("targetId"), reason = value("reason");
      if (kind === "reject-listing") {
        const r = room(targetId); if (!r) return;
        r.postStatus = "REJECTED"; r.rejectionReason = reason; logAudit("REJECT_POST", `Tin đăng ${r.code}`, reason);
      } else if (kind === "reject-verification") {
        const verification = byId(state.verifications, targetId); if (!verification) return;
        verification.status = "REJECTED"; verification.rejectionReason = reason; logAudit("REJECT_VERIFICATION", person(verification.userId).name, reason);
      } else if (kind === "toggle-user") {
        state.lockedUsers ||= [];
        const locking = !state.lockedUsers.includes(targetId);
        state.lockedUsers = locking ? [...state.lockedUsers, targetId] : state.lockedUsers.filter((x) => x !== targetId);
        logAudit(locking ? "LOCK_USER" : "UNLOCK_USER", person(targetId).name, reason);
      }
      finish("Đã lưu quyết định kiểm duyệt."); return;
    }
    case "review": {
      const c = contract(value("contractId")); if (!c || state.role !== "tenant" || !c.members.some((m) => m.tenantId === userId() && ["ACTIVE", "LEFT"].includes(m.status))) return;
      if (state.reviews.some((r) => r.contractId === c.id)) { flash("Bạn đã đánh giá lượt thuê này."); return; }
      state.reviews.push({ id: `rev${Date.now()}`, contractId: c.id, roomId: c.roomId, reviewerId: "lan", rating: Number(value("rating")), content: value("content") });
      finish("Đã đăng đánh giá phòng."); return;
    }
    case "identity": {
      const file = form.querySelector('input[name="document"]')?.files?.[0]; if (!file) return;
      state.verifications.push({ id: `ver${Date.now()}`, userId: userId(), type: "Căn cước người thuê", status: "PENDING", identity: value("identity"), fileName: file.name, date: todayISO() });
      finish("Đã gửi hồ sơ chờ xác minh."); return;
    }
    case "roommate-profile": {
      if (Number(value("budgetMax")) < Number(value("budgetMin"))) { flash("Ngân sách tối đa phải lớn hơn mức tối thiểu."); return; }
      state.roommateProfile = { location: value("location"), budgetMin: Number(value("budgetMin")), budgetMax: Number(value("budgetMax")), habits: value("habits"), available: value("available") };
      finish("Đã cập nhật tiêu chí ở ghép."); return;
    }
    case "profile": state.nameOverrides ||= {}; state.nameOverrides[userId()] = value("fullName"); finish("Đã lưu thông tin tài khoản."); return;
    default: flash("Biểu mẫu chưa có trong bản mô phỏng.");
  }
}

// Keep the original PNG available if a browser cannot load the lighter WebP.
document.addEventListener("error", (event) => {
  const image = event.target;
  if (!(image instanceof HTMLImageElement)) return;
  const source = new URL(image.currentSrc || image.src, document.baseURI);
  if (source.origin !== location.origin || !/\/assets\/r[1-6]\.webp$/.test(source.pathname)) return;
  source.pathname = source.pathname.replace(/\.webp$/, ".png");
  image.src = source.href;
}, true);

document.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target || target.disabled) return;
  handleAction(target.dataset.action, target.dataset.id || "");
});
document.addEventListener("submit", (event) => {
  const form = event.target.closest("form[data-form]");
  if (!form) return;
  event.preventDefault();
  handleForm(form);
});

document.addEventListener("keydown", (event) => {
  const input = event.target;
  if (!(input instanceof HTMLTextAreaElement) || input.form?.dataset.form !== "chat-message") return;
  if (event.key !== "Enter" || event.shiftKey || event.ctrlKey || event.metaKey || event.altKey || event.isComposing || event.keyCode === 229) return;
  event.preventDefault();
  if (input.value.trim()) input.form.requestSubmit();
});
document.addEventListener("change", (event) => {
  const target = event.target;
  if (target.dataset.change === "listing-room") {
    const selected = room(target.value);
    if (!canSubmitNewListing(selected) || !target.form) return;
    target.form.elements.title.value = selected.title || "";
    target.form.elements.description.value = selected.description || "";
    target.form.elements.photo.value = selected.photo || PHOTO.r6;
    target.form.elements.originalPostStatus.value = selected.postStatus || "NONE";
    return;
  }
  if (target.dataset.change === "chat-context") { selectChatContext(target.value); $("#chat-room-context")?.focus({ preventScroll: true }); return; }
  if (target.dataset.change === "house") { state.houseSelection = target.value; state.roomSelection = state.rooms.find((r) => r.houseId === target.value)?.id || ""; save(); render(); }
  if (target.dataset.change === "room") { state.roomSelection = target.value; save(); render(); }
  if (target.dataset.change === "room-service") {
    const service = byId(state.services, target.dataset.id);
    if (!service?.active) return;
    let entry = state.roomServices.find((x) => x.roomId === state.roomSelection && x.serviceId === service.id);
    if (!entry) { entry = { roomId: state.roomSelection, serviceId: service.id, active: true, override: null }; state.roomServices.push(entry); }
    else entry.active = target.checked;
    save(); render();
  }
  if (target.dataset.change === "invoice-contract") { state.invoiceContractSelection = target.value; save(); openInvoice(); }
  if (target.dataset.change === "contract-template") { const selected = byId(state.templates || [], target.value); const terms = target.form?.elements.terms; if (selected && terms) terms.value = selected.content; }
  if (target.dataset.change === "change-type") { const section = $("#transfer-target"); if (section) section.hidden = target.value !== "TRANSFER"; }
});
document.addEventListener("input", (event) => {
  if (event.target.id === "chat-message") {
    state.chatDrafts[chatDraftKey()] = event.target.value;
    save(); syncChatComposer();
  }
  if (event.target.id === "chat-search") {
    const query = event.target.value.toLocaleLowerCase("vi-VN");
    document.querySelectorAll(".contact").forEach((node) => { node.hidden = !node.textContent.toLocaleLowerCase("vi-VN").includes(query); });
  }
});

const initialParams = new URLSearchParams(location.search);
if (["tenant", "landlord", "admin"].includes(initialParams.get("role"))) state.role = initialParams.get("role");
if (NAV[state.role].some(([id]) => id === initialParams.get("view"))) state.view = initialParams.get("view");
window.__troday = { getState: () => state, reset: () => { state = structuredClone(seed); save(); render(); }, action: handleAction };
render();
