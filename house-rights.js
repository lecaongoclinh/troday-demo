// Province codes: Decision 19/2025/QD-TTg, effective 2025-07-01.
// https://vanban.chinhphu.vn/?classid=1&docid=214409&pageid=27160
const HOUSE_PROVINCES = [["01","Hà Nội"],["04","Cao Bằng"],["08","Tuyên Quang"],["11","Điện Biên"],["12","Lai Châu"],["14","Sơn La"],["15","Lào Cai"],["19","Thái Nguyên"],["20","Lạng Sơn"],["22","Quảng Ninh"],["24","Bắc Ninh"],["25","Phú Thọ"],["31","Hải Phòng"],["33","Hưng Yên"],["37","Ninh Bình"],["38","Thanh Hóa"],["40","Nghệ An"],["42","Hà Tĩnh"],["44","Quảng Trị"],["46","Huế"],["48","Đà Nẵng"],["51","Quảng Ngãi"],["52","Gia Lai"],["56","Khánh Hòa"],["66","Đắk Lắk"],["68","Lâm Đồng"],["75","Đồng Nai"],["79","Hồ Chí Minh"],["80","Tây Ninh"],["82","Đồng Tháp"],["86","Vĩnh Long"],["91","An Giang"],["92","Cần Thơ"],["96","Cà Mau"]];
const HOUSE_RIGHT_TYPES = { OWNER: "Chủ sở hữu", AUTHORIZED: "Được ủy quyền cho thuê", SUBLESSOR: "Thuê và được cho thuê lại" };
const HOUSE_DOCUMENT_TYPES = { OWNER_PROOF: "Giấy tờ thể hiện quyền đối với nhà", AUTHORIZATION: "Văn bản ủy quyền cho thuê", LEASE_AGREEMENT: "Hợp đồng thuê gốc", SUBLET_CONSENT: "Sự đồng ý cho thuê lại", OTHER: "Minh chứng bổ sung" };
const HOUSE_REQUIRED_DOCUMENTS = { OWNER: ["OWNER_PROOF"], AUTHORIZED: ["OWNER_PROOF", "AUTHORIZATION"], SUBLESSOR: ["LEASE_AGREEMENT", "SUBLET_CONSENT"] };
const HOUSE_VERIFICATION_LABELS = { DRAFT: ["Chưa xác minh", "gray"], PENDING: ["Chờ xét duyệt", "yellow"], APPROVED: ["Đã xác minh quyền cho thuê", "green"], REJECTED: ["Cần bổ sung hồ sơ", "red"], WITHDRAWN: ["Đã rút hồ sơ", "gray"], REVOKED: ["Đã thu hồi xác minh", "red"], EXPIRED: ["Quyền cho thuê đã hết hạn", "orange"], SUPERSEDED: ["Hồ sơ đã được thay thế", "gray"], STALE: ["Cần xác minh lại", "orange"], FUTURE: ["Chưa đến thời hạn cho thuê", "yellow"] };
const houseSubmissionLocks = new Set();
let houseProofPreviewUrl = null;

function houseIdentity(h) {
  return { ownerId: h.ownerId, address: h.address, provinceCode: h.provinceCode || "", localityCode: h.localityCode || null, latitude: h.latitude ?? null, longitude: h.longitude ?? null };
}
function normalizeHouseData(data, examples) {
  const old = !Array.isArray(data.houseVerifications);
  for (const h of data.houses) {
    const example = examples?.houses.find((item) => item.id === h.id && item.ownerId === h.ownerId && item.address === h.address);
    h.version ||= 1; h.verificationVersion ||= 1;
    h.provinceCode ??= example?.provinceCode || "";
    h.localityCode ??= null; h.latitude ??= null; h.longitude ??= null; h.notes ??= "";
  }
  data.houseVerifications ||= []; data.houseVerificationDocuments ||= []; data.houseProofFiles ||= [];
  if (old && examples) {
    // Only the unchanged bundled examples receive clearly labelled demo evidence.
    for (const v of examples.houseVerifications) {
      const h = data.houses.find((item) => item.id === v.houseId);
      if (h && JSON.stringify(houseIdentity(h)) === JSON.stringify(v.houseSnapshot)) {
        data.houseVerifications.push(structuredClone(v));
        const documents = examples.houseVerificationDocuments.filter((d) => d.verificationId === v.id);
        data.houseVerificationDocuments.push(...structuredClone(documents));
        data.houseProofFiles.push(...structuredClone(examples.houseProofFiles.filter((f) => documents.some((d) => d.fileId === f.id))));
      }
    }
  }
}
function seedHouseVerificationExamples(data) {
  for (const h of data.houses) { h.provinceCode = "01"; h.version = 1; h.verificationVersion = 1; }
  normalizeHouseData(data);
  for (const h of data.houses) {
    const id = `hv-demo-${h.id}`, fileId = `proof-demo-${h.id}`;
    data.houseVerifications.push({ id, houseId: h.id, applicantId: h.ownerId, houseVersion: 1, houseSnapshot: houseIdentity(h), rightType: "OWNER", scope: "Toàn bộ nhà trọ trong dữ liệu mẫu", validFrom: "2025-01-01", validUntil: null, status: "APPROVED", submittedAt: "2026-10-01T00:00:00.000Z", reviewedBy: "admin", reviewedAt: "2026-10-01T01:00:00.000Z", isDemo: true });
    data.houseProofFiles.push({ id: fileId, ownerId: h.ownerId, name: "Minh chứng mẫu — không phải giấy tờ thực.pdf", type: "application/pdf", size: 0, isDemo: true });
    data.houseVerificationDocuments.push({ id: `doc-${id}`, verificationId: id, fileId, documentType: "OWNER_PROOF" });
  }
}
function houseVerificationMatches(v, h) {
  return !!h && v.houseId === h.id && v.applicantId === h.ownerId && v.houseVersion === h.verificationVersion && Object.entries(houseIdentity(h)).every(([key,value]) => v.houseSnapshot?.[key] === value);
}
function effectiveHouseVerification(houseId) {
  const h = house(houseId);
  if (!h || (state.lockedUsers || []).includes(h.ownerId)) return null;
  return state.houseVerifications.find((v) => v.status === "APPROVED" && houseVerificationMatches(v, h) && v.validFrom <= todayISO() && (!v.validUntil || v.validUntil >= todayISO())) || null;
}
function houseVerificationState(h) {
  const pending = state.houseVerifications.find((v) => v.houseId === h.id && v.status === "PENDING" && houseVerificationMatches(v,h));
  if (pending) return { status: "PENDING", record: pending };
  const approved = effectiveHouseVerification(h.id);
  if (approved) return { status: "APPROVED", record: approved };
  const list = state.houseVerifications.filter((v) => v.houseId === h.id);
  const current = list.filter((v) => houseVerificationMatches(v, h)).at(-1);
  if (!current) return { status: list.length ? "STALE" : "DRAFT", record: list.at(-1) };
  return { status: current.status === "APPROVED" ? current.validUntil && current.validUntil < todayISO() ? "EXPIRED" : current.validFrom > todayISO() ? "FUTURE" : "STALE" : current.status, record: current };
}
function canManageHouse(h) { return state.role === "landlord" && !!h && h.ownerId === userId() && !(state.lockedUsers || []).includes(userId()); }
function canReadHouseVerification(v) { return !!v && !(state.lockedUsers || []).includes(userId()) && (state.role === "admin" || state.role === "landlord" && v.applicantId === userId()); }
function houseRightsGate(roomId) {
  return !!room(roomId) && !!effectiveHouseVerification(room(roomId).houseId);
}
function renderHouseProperties() {
  const own = state.houses.filter(canManageHouse), selected = own.find((h) => h.id === state.houseSelection) || own[0];
  const create = button(`${icon("plus")} Thêm nhà trọ`, "open-house", "", "primary");
  if (!selected) return head("Nhà & phòng", "Tạo nhà trọ và xác minh quyền cho thuê để bắt đầu", create) + empty("Chưa có nhà trọ", "Tạo nhà trọ đầu tiên, sau đó thêm phòng và nộp hồ sơ xác minh.") + `<div class="heading-actions">${button("Tạo nhà trọ đầu tiên", "open-house", "", "primary")}</div>`;
  state.houseSelection = selected.id;
  const rooms = state.rooms.filter((r) => r.houseId === selected.id), verification = houseVerificationState(selected);
  if (!rooms.some((r) => r.id === state.roomSelection)) state.roomSelection = rooms[0]?.id || "";
  const record = verification.record;
  return head("Nhà & phòng", `${own.length} nhà trọ · ${rooms.length} phòng`, `${create}${button("Thêm phòng", "open-room")}`) +
    `<div class="filter-bar"><label class="field" style="max-width:330px">Nhà trọ<select id="house-select" data-change="house">${own.map((h) => `<option value="${esc(h.id)}" ${h.id === selected.id ? "selected" : ""}>${esc(h.name)}</option>`).join("")}</select></label></div>
    <div class="flow-banner"><div><strong>${esc(selected.name)}</strong><small>${esc(selected.address)}</small><small>${HOUSE_PROVINCES.find(([code]) => code === selected.provinceCode)?.[1] || "Cần cập nhật tỉnh/thành"}</small></div>${button("Sửa thông tin nhà", "edit-house", selected.id, "small")}</div>
    <div class="house-verification-summary subtle-panel">${chip(...HOUSE_VERIFICATION_LABELS[verification.status])}${record?.isDemo ? chip("Hồ sơ mẫu mô phỏng") : ""}<p>${effectiveHouseVerification(selected.id) ? "Nhà đã đủ điều kiện tiếp tục quy trình đăng tin và thuê mới." : "Bạn có thể chuẩn bị phòng và dịch vụ. Cần xác minh quyền cho thuê trước khi công khai tin hoặc tạo hợp đồng mới."}</p>${record?.rejectionReason ? `<p>Lý do: ${esc(record.rejectionReason)}</p>` : ""}<div class="table-actions">${verification.status !== "PENDING" ? button(record ? "Nộp hồ sơ xác minh mới" : "Xác minh quyền cho thuê", "submit-house-proof", selected.id, "small primary") : ""}${record ? button("Xem hồ sơ / lịch sử", "house-verification-history", selected.id, "small") : ""}${verification.status === "PENDING" ? button("Rút hồ sơ", "withdraw-house-verification", record.id, "small") : ""}${button("Cấu hình dịch vụ", "house-services", selected.id, "small")}</div></div>
    ${rooms.length ? `<div class="table-surface table-scroll"><table><thead><tr><th>Phòng</th><th>Diện tích</th><th>Sức chứa</th><th>Giá thuê</th><th>Tình trạng</th><th></th></tr></thead><tbody>${rooms.map((r) => `<tr data-room-id="${esc(r.id)}"><td><div class="room-row"><img src="${esc(r.photo)}" alt=""><div><span class="cell-title">${esc(r.code)}</span><span class="cell-sub">${state.posts.filter((p) => p.roomId === r.id).length} bài · ${pendingPostCount(r.id)}/3 chờ duyệt</span></div></div></td><td>${r.area} m²</td><td>${r.capacity} người</td><td>${money(r.price)}</td><td>${chip(r.status === "AVAILABLE" ? "Còn phòng" : r.status === "OCCUPIED" ? "Đang ở" : r.status === "RESERVED" ? "Đã giữ" : "Bảo trì", r.status === "AVAILABLE" ? "green" : "yellow")}</td><td class="actions-cell"><div class="table-actions">${button("Xem chi tiết", "room-detail", r.id, "small")}${button("Sửa", "edit-room", r.id, "small")}</div></td></tr>`).join("")}</tbody></table></div>` : empty("Nhà chưa có phòng", "Thêm phòng hoặc cấu hình dịch vụ; bạn có thể nộp hồ sơ xác minh ngay.")}`;
}
function openHouseEditor(id = "") {
  const h = id ? house(id) : null;
  if (state.role !== "landlord" || (state.lockedUsers || []).includes(userId()) || id && !canManageHouse(h)) return;
  modal(h ? "Sửa thông tin nhà trọ" : "Thêm nhà trọ", `<form data-form="house"><input type="hidden" name="houseId" value="${esc(id)}"><input type="hidden" name="originalVersion" value="${h?.version || 0}"><input type="hidden" name="creationKey" value="${esc(h?.creationKey || `house-${userId()}-${Date.now()}-${state.houses.length}`)}"><div class="form-grid"><label class="field full">Tên nhà trọ<input name="name" maxlength="150" value="${esc(h?.name || "")}" required></label><label class="field full">Địa chỉ đầy đủ<input name="address" maxlength="500" value="${esc(h?.address || "")}" required></label><label class="field">Tỉnh / thành phố<select name="provinceCode" required><option value="">Chọn tỉnh / thành phố</option>${HOUSE_PROVINCES.map(([code,label]) => `<option value="${code}" ${h?.provinceCode === code ? "selected" : ""}>${label}</option>`).join("")}</select></label><label class="field">Khu vực hiển thị<input name="area" maxlength="150" value="${esc(h?.area || "")}" placeholder="Khu vực, phường/xã..."></label><label class="field">Vĩ độ (tuỳ chọn)<input type="number" name="latitude" min="-90" max="90" step="0.0000001" value="${h?.latitude ?? ""}"></label><label class="field">Kinh độ (tuỳ chọn)<input type="number" name="longitude" min="-180" max="180" step="0.0000001" value="${h?.longitude ?? ""}"></label><label class="field full">Ghi chú<textarea name="notes" maxlength="2000">${esc(h?.notes || "")}</textarea></label></div><p class="muted tiny">Lưu nhà nháp trước, rồi thêm phòng và nộp minh chứng quyền cho thuê. Thay đổi địa chỉ hoặc vị trí định danh sẽ cần xác minh lại.</p><div class="form-actions">${button("Hủy", "close-dialog")}<button type="submit" class="button primary">Lưu nhà trọ</button></div></form>`);
}
function renderHouseServices() {
  const own = state.houses.filter(canManageHouse), h = own.find((item) => item.id === state.houseSelection) || own[0];
  if (!h) return head("Dịch vụ", "Tạo nhà trọ trước khi cấu hình dịch vụ", button("Thêm nhà trọ", "open-house", "", "primary")) + empty("Chưa có nhà trọ", "Nhà trọ mới có thể cấu hình dịch vụ trước khi thêm phòng.");
  state.houseSelection = h.id;
  const services = state.services.filter((s) => s.houseId === h.id), rooms = state.rooms.filter((r) => r.houseId === h.id);
  const selected = rooms.find((r) => r.id === state.roomSelection) || rooms[0]; state.roomSelection = selected?.id || "";
  const serviceRows = services.map((s) => `<tr><td class="cell-title">${esc(s.name)}</td><td>${money(s.price)}/${esc(s.unit)}</td><td>${s.method === "METERED" ? "Theo đồng hồ" : s.method === "PER_PERSON" ? "Theo người" : "Theo phòng"}</td><td>${chip(s.active ? "Đang dùng" : "Ngừng dùng", s.active ? "green" : "gray")}</td><td class="actions-cell"><div class="table-actions">${button("Sửa", "edit-service", s.id, "small")}${button(s.active ? "Ngừng" : "Bật", "toggle-service", s.id, "small")}</div></td></tr>`).join("");
  const applied = selected ? `<label class="field" style="margin-bottom:9px">Phòng<select data-change="room">${rooms.map((r) => `<option value="${esc(r.id)}" ${r.id === selected.id ? "selected" : ""}>${esc(r.code)} · ${esc(r.title)}</option>`).join("")}</select></label><div class="flat-surface" style="padding:5px 14px">${services.map((s) => { const item = state.roomServices.find((x) => x.roomId === selected.id && x.serviceId === s.id); return `<div class="checkbox-row"><input type="checkbox" id="apply-${esc(s.id)}" data-change="room-service" data-id="${esc(s.id)}" ${item?.active ? "checked" : ""} ${!s.active ? "disabled" : ""}><div><label for="apply-${esc(s.id)}"><strong>${esc(s.name)}</strong></label><small>${item?.override != null ? `Giá riêng ${money(item.override)}` : `Theo nhà ${money(s.price)}`} / ${esc(s.unit)}</small></div>${item?.active ? button("Giá riêng", "override-service", s.id, "small") : ""}</div>`; }).join("") || '<p class="muted tiny">Thêm dịch vụ cho nhà trước khi áp dụng vào phòng.</p>'}</div>` : empty("Chưa có phòng để áp dụng dịch vụ", "Bạn vẫn có thể thêm giá dịch vụ mặc định cho nhà trước.");
  return head("Dịch vụ", "Cấu hình theo nhà, áp dụng riêng cho từng phòng", button(`${icon("plus")} Thêm dịch vụ`, "open-service", "", "primary")) + `<div class="filter-bar"><label class="field" style="max-width:330px">Nhà trọ<select data-change="house">${own.map((item) => `<option value="${esc(item.id)}" ${h.id === item.id ? "selected" : ""}>${esc(item.name)}</option>`).join("")}</select></label></div><div class="service-grid"><section><div class="section-bar" style="margin-top:0"><h2>Dịch vụ của ${esc(h.name)}</h2></div><div class="table-surface table-scroll">${services.length ? `<table><thead><tr><th>Dịch vụ</th><th>Giá mặc định</th><th>Cách tính</th><th>Trạng thái</th><th></th></tr></thead><tbody>${serviceRows}</tbody></table>` : empty("Chưa có dịch vụ", "Thêm điện, nước, internet hoặc dịch vụ riêng của nhà.")}</div></section><section><div class="section-bar" style="margin-top:0"><h2>Áp dụng cho phòng</h2></div>${applied}</section></div>`;
}
function saveHouseForm(form) {
  if (state.role !== "landlord" || (state.lockedUsers || []).includes(userId())) return;
  const data = new FormData(form), value = (key) => String(data.get(key) ?? "").trim();
  const current = value("houseId") && house(value("houseId"));
  if (value("houseId") && (!canManageHouse(current) || current.version !== Number(value("originalVersion")))) { flash("Thông tin nhà đã thay đổi hoặc bạn không có quyền sửa. Hãy mở lại form."); return; }
  const latitude = value("latitude") === "" ? null : Number(value("latitude")), longitude = value("longitude") === "" ? null : Number(value("longitude"));
  if (!value("name") || value("name").length > 150 || !value("address") || value("address").length > 500 || !HOUSE_PROVINCES.some(([code]) => code === value("provinceCode")) || value("area").length > 150 || value("notes").length > 2000 || (latitude === null) !== (longitude === null) || latitude !== null && (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180)) { flash("Nhập tên, địa chỉ, tỉnh/thành và cặp tọa độ hợp lệ."); return; }
  const existing = !current && state.houses.find((h) => h.ownerId === userId() && h.creationKey === value("creationKey"));
  if (existing) { state.houseSelection = existing.id; finish("Nhà trọ đã được lưu."); return; }
  const attrs = { name: value("name"), address: value("address"), provinceCode: value("provinceCode"), area: value("area"), latitude, longitude, notes: value("notes") };
  if (current) {
    const changed = JSON.stringify(houseIdentity(current)) !== JSON.stringify(houseIdentity({ ...current, ...attrs }));
    Object.assign(current, attrs, { version: current.version + 1 });
    if (changed) {
      current.verificationVersion++;
      for (const v of state.houseVerifications.filter((v) => v.houseId === current.id && v.status === "PENDING")) Object.assign(v, { status: "WITHDRAWN", withdrawnAt: new Date().toISOString(), withdrawalReason: "Thông tin định danh nhà đã thay đổi." });
    }
    state.houseSelection = current.id;
  } else {
    if (!value("creationKey")) { flash("Hãy mở lại form thêm nhà."); return; }
    const h = { id: `h-${Date.now()}-${state.houses.length}`, ownerId: userId(), creationKey: value("creationKey"), version: 1, verificationVersion: 1, localityCode: null, ...attrs };
    state.houses.push(h); state.houseSelection = h.id; state.roomSelection = "";
  }
  state.view = "properties"; finish(current ? "Đã cập nhật thông tin nhà trọ." : "Đã tạo nhà nháp. Bạn có thể thêm phòng và nộp hồ sơ xác minh.");
}
function openHouseProofForm(id) {
  const h = house(id);
  if (!canManageHouse(h)) return;
  if (state.houseVerifications.some((v) => v.houseId === id && v.status === "PENDING")) { flash("Nhà đang có một hồ sơ chờ xét duyệt."); return; }
  modal("Xác minh quyền cho thuê", `<form data-form="house-verification"><input type="hidden" name="houseId" value="${esc(id)}"><input type="hidden" name="houseVersion" value="${h.verificationVersion}"><p><strong>${esc(h.name)}</strong><br>${esc(h.address)}</p><div class="form-grid"><label class="field full">Tư cách cho thuê<select name="rightType" data-change="house-right-type">${Object.entries(HOUSE_RIGHT_TYPES).map(([code,label]) => `<option value="${code}">${label}</option>`).join("")}</select></label><label class="field full">Phạm vi quyền cho thuê<textarea name="scope" maxlength="1000" required placeholder="Mô tả phạm vi nhà/phòng tại địa chỉ này được phép cho thuê."></textarea></label><label class="field">Có hiệu lực từ<input type="date" name="validFrom" value="${todayISO()}" required></label><label class="field">Có hiệu lực đến<input type="date" name="validUntil"><small class="muted tiny">Bắt buộc với ủy quyền hoặc cho thuê lại.</small></label>${Object.entries(HOUSE_DOCUMENT_TYPES).map(([code,label]) => `<label class="field full" data-house-document="${code}" ${["OWNER_PROOF","OTHER"].includes(code) ? "" : "hidden"}>${label}<input type="file" name="document_${code}" accept="application/pdf,image/jpeg,image/png,image/webp" ${code === "OTHER" ? "multiple" : ""} ${code === "OWNER_PROOF" ? "required" : ""} ${["OWNER_PROOF","OTHER"].includes(code) ? "" : "disabled"}></label>`).join("")}</div><p class="muted tiny">PDF, JPG, PNG hoặc WebP; tối đa 8 tệp, mỗi tệp tối đa 5 MB. Minh chứng trong wireframe được lưu cục bộ trong trình duyệt để xem lại; chỉ giao diện của bạn và quản trị được mở hồ sơ. Nền tảng kiểm tra hồ sơ theo phạm vi khai báo.</p><div class="form-actions">${button("Hủy", "close-dialog")}<button class="button primary" type="submit">Gửi hồ sơ xét duyệt</button></div></form>`);
}
function updateHouseProofFields(form) {
  const type = form.elements.rightType.value, required = HOUSE_REQUIRED_DOCUMENTS[type] || [];
  form.elements.validUntil.required = type !== "OWNER";
  for (const section of form.querySelectorAll("[data-house-document]")) {
    const code = section.dataset.houseDocument, input = section.querySelector("input");
    section.hidden = code !== "OTHER" && !required.includes(code);
    input.disabled = section.hidden; input.required = required.includes(code);
  }
}
function houseProofError(v, documents) {
  const h = house(v.houseId);
  if (!Object.hasOwn(HOUSE_RIGHT_TYPES, v.rightType) || !houseVerificationMatches(v, h)) return "Nhà, người nộp hoặc thông tin định danh đã thay đổi. Hãy nộp hồ sơ mới.";
  if (!v.scope?.trim() || v.scope.length > 1000 || !Number.isFinite(appointmentTimestamp(v.validFrom, "12:00")) || v.validUntil && (!Number.isFinite(appointmentTimestamp(v.validUntil, "12:00")) || v.validUntil < v.validFrom || v.validUntil < todayISO()) || v.rightType !== "OWNER" && !v.validUntil) return "Nhập phạm vi và thời hạn quyền cho thuê hợp lệ.";
  if (HOUSE_REQUIRED_DOCUMENTS[v.rightType].some((type) => !documents.some((d) => d.documentType === type))) return "Chưa đủ loại minh chứng theo tư cách cho thuê đã chọn.";
  return "";
}
async function submitHouseVerification(form) {
  const data = new FormData(form), value = (key) => String(data.get(key) ?? "").trim(), h = house(value("houseId"));
  if (!canManageHouse(h) || houseSubmissionLocks.has(h.id)) return;
  if (state.houseVerifications.some((v) => v.houseId === h.id && v.status === "PENDING")) { flash("Nhà đang có hồ sơ chờ xét duyệt."); return; }
  const v = { id: `hv-${Date.now()}-${state.houseVerifications.length}`, houseId: h.id, applicantId: userId(), houseVersion: Number(value("houseVersion")), houseSnapshot: houseIdentity(h), rightType: value("rightType"), scope: value("scope"), validFrom: value("validFrom"), validUntil: value("validUntil") || null, status: "PENDING", submittedAt: new Date().toISOString() };
  const entries = Object.keys(HOUSE_DOCUMENT_TYPES).flatMap((documentType) => data.getAll(`document_${documentType}`).filter((file) => file && typeof file.name === "string" && file.name && file.size > 0).map((file) => ({ file, documentType })));
  const error = houseProofError(v, entries);
  if (error) { flash(error); return; }
  if (entries.length > 8 || entries.some(({ file }) => !["application/pdf","image/jpeg","image/png","image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024)) { flash("Minh chứng phải là PDF/ảnh hợp lệ, tối đa 8 tệp và 5 MB mỗi tệp."); return; }
  houseSubmissionLocks.add(h.id);
  const submit = form.querySelector('button[type="submit"]'); if (submit) submit.disabled = true;
  let stored = [];
  try {
    stored = await window.houseProofStore.save(entries, v.applicantId);
    if (!canManageHouse(house(h.id)) || userId() !== v.applicantId || houseProofError(v, entries) || state.houseVerifications.some((item) => item.houseId === h.id && item.status === "PENDING")) {
      await window.houseProofStore.remove(stored.map((f) => f.id)); flash("Thông tin nhà hoặc hồ sơ đã thay đổi trong lúc tải tệp. Hãy mở lại form."); return;
    }
    state.houseProofFiles.push(...stored);
    state.houseVerificationDocuments.push(...stored.map((file, index) => ({ id: `doc-${v.id}-${index}`, verificationId: v.id, fileId: file.id, documentType: file.documentType })));
    state.houseVerifications.push(v);
    state.notifications.push({ id: `n-${v.id}-admin`, userId: "admin", text: `${person(v.applicantId).name} gửi hồ sơ quyền cho thuê ${h.name}.`, read: false });
    state.houseSelection = h.id; state.view = "properties"; finish("Đã gửi hồ sơ quyền cho thuê. Chờ quản trị xét duyệt.");
  } catch { flash("Không lưu được minh chứng trong trình duyệt. Hãy kiểm tra dung lượng và thử lại."); }
  finally { houseSubmissionLocks.delete(h.id); if (submit) submit.disabled = false; }
}
function houseVerificationDocuments(v) { return state.houseVerificationDocuments.filter((d) => d.verificationId === v.id); }
function openHouseVerification(id) {
  const v = byId(state.houseVerifications, id);
  if (!canReadHouseVerification(v)) return;
  const h = house(v.houseId), status = houseVerificationMatches(v,h) ? v.status === "APPROVED" && v.validUntil && v.validUntil < todayISO() ? "EXPIRED" : v.status : "STALE";
  const documents = houseVerificationDocuments(v);
  modal("Hồ sơ quyền cho thuê", `<div class="stack"><strong>${esc(h?.name || "Nhà trọ")}</strong>${chip(...HOUSE_VERIFICATION_LABELS[status])}${v.isDemo ? '<p class="muted tiny">Hồ sơ mẫu mô phỏng, không phải kết quả kiểm tra giấy tờ thực.</p>' : ""}<div class="list-row"><div><strong>Địa chỉ đã nộp</strong><small>${esc(v.houseSnapshot.address)}</small><small>Người nộp: ${esc(person(v.applicantId).name)}</small></div></div><div class="list-row"><div><strong>${HOUSE_RIGHT_TYPES[v.rightType]}</strong><small>Phạm vi: ${esc(v.scope)}</small><small>Hiệu lực: ${dateLabel(v.validFrom)} – ${v.validUntil ? dateLabel(v.validUntil) : "Không ghi thời hạn"}</small></div></div><h3>Minh chứng</h3>${documents.map((d) => { const f = byId(state.houseProofFiles,d.fileId); return `<div class="list-row"><div><strong>${HOUSE_DOCUMENT_TYPES[d.documentType]}</strong><small>${esc(f?.name || "Tệp không còn khả dụng")}</small></div>${f ? button("Xem tệp", "view-house-proof", d.id, "small") : ""}</div>`; }).join("")}${v.rejectionReason ? `<p>Lý do từ chối: ${esc(v.rejectionReason)}</p>` : ""}${v.revocationReason ? `<p>Lý do thu hồi: ${esc(v.revocationReason)}</p>` : ""}${v.withdrawalReason ? `<p>${esc(v.withdrawalReason)}</p>` : ""}${v.reviewedBy ? `<p class="muted tiny">Người xét duyệt: ${esc(person(v.reviewedBy).name)}</p>` : ""}</div><div class="form-actions">${button("Đóng", "close-dialog")}${state.role === "admin" && v.status === "PENDING" ? `${button("Từ chối", "reject-house-verification", v.id)}${button("Duyệt hồ sơ", "approve-house-verification", v.id, "primary")}` : ""}${state.role === "admin" && v.status === "APPROVED" ? button("Thu hồi xác minh", "revoke-house-verification", v.id, "danger") : ""}</div>`);
}
async function openHouseProofDocument(id) {
  const d = byId(state.houseVerificationDocuments, id), v = d && byId(state.houseVerifications,d.verificationId);
  if (!canReadHouseVerification(v)) return;
  const metadata = byId(state.houseProofFiles,d.fileId);
  if (!metadata || metadata.ownerId !== v.applicantId) return;
  if (metadata.isDemo) { modal("Minh chứng mẫu", `<p>Đây là tệp minh chứng giả lập của dữ liệu mẫu, không chứa giấy tờ cá nhân hay bằng chứng quyền sở hữu thực.</p><div class="form-actions">${button("Quay lại hồ sơ", "review-house-verification", v.id)}</div>`); return; }
  try {
    const file = await window.houseProofStore.get(d.fileId);
    if (!canReadHouseVerification(v) || !file || file.ownerId !== v.applicantId) { flash("Tệp không còn trong trình duyệt này."); return; }
    const url = URL.createObjectURL(file.blob);
    modal(esc(metadata.name), `${metadata.type === "application/pdf" ? `<iframe class="house-proof-preview" title="Minh chứng quyền cho thuê" src="${url}"></iframe>` : `<img class="house-proof-preview" alt="Minh chứng quyền cho thuê" src="${url}">`}<div class="form-actions">${button("Quay lại hồ sơ", "review-house-verification", v.id)}</div>`);
    houseProofPreviewUrl = url;
  } catch { flash("Không mở được tệp minh chứng. Hãy dùng đúng trình duyệt đã tải tệp."); }
}
function clearHouseProofPreview() { if (houseProofPreviewUrl) { URL.revokeObjectURL(houseProofPreviewUrl); houseProofPreviewUrl = null; } }
function openHouseVerificationHistory(id) {
  const h = house(id);
  if (!(state.role === "admin" || canManageHouse(h))) return;
  const rows = state.houseVerifications.filter((v) => v.houseId === id && canReadHouseVerification(v)).reverse();
  modal("Lịch sử xác minh nhà trọ", `<p>${esc(h.name)} · ${esc(h.address)}</p>${rows.map((v) => `<div class="list-row"><div><strong>${HOUSE_RIGHT_TYPES[v.rightType]}</strong><small>Phiên bản định danh ${v.houseVersion}</small>${chip(...HOUSE_VERIFICATION_LABELS[v.status])}</div>${button("Xem hồ sơ", "review-house-verification", v.id, "small")}</div>`).join("") || '<p>Chưa có hồ sơ.</p>'}`);
}
function renderHouseVerificationQueue() {
  if (state.role !== "admin") return "";
  const rows = [...state.houseVerifications].reverse();
  return `<div class="section-bar"><h2>Quyền cho thuê từng nhà trọ</h2>${chip(`${rows.filter((v) => v.status === "PENDING").length} chờ duyệt`)}</div><div class="flat-surface" style="padding:0 15px">${rows.map((v) => `<div class="list-row house-verification-row" data-house-verification="${esc(v.id)}"><div><strong>${esc(house(v.houseId)?.name)}</strong><small>${esc(v.houseSnapshot.address)} · ${esc(person(v.applicantId).name)}</small>${chip(...HOUSE_VERIFICATION_LABELS[houseVerificationMatches(v,house(v.houseId)) ? v.status : "STALE"])}</div>${button("Xem hồ sơ", "review-house-verification", v.id, "small")}</div>`).join("") || '<p class="muted tiny">Chưa có hồ sơ quyền cho thuê.</p>'}</div>`;
}
function openHouseVerificationDecision(id, decision) {
  const v = byId(state.houseVerifications,id);
  if (state.role !== "admin" || !v || (state.lockedUsers || []).includes(userId()) || (decision === "REVOKE" ? v.status !== "APPROVED" : v.status !== "PENDING")) return;
  modal(decision === "APPROVE" ? "Duyệt quyền cho thuê" : decision === "REVOKE" ? "Thu hồi xác minh" : "Từ chối hồ sơ", `<form data-form="house-verification-decision"><input type="hidden" name="verificationId" value="${esc(id)}"><input type="hidden" name="decision" value="${decision}"><p>${esc(house(v.houseId)?.name)} · ${esc(v.houseSnapshot.address)}</p>${decision === "APPROVE" ? '<label class="consent-field"><input type="checkbox" name="checkedEvidence" value="yes" required> Tôi đã đối chiếu người nộp, địa chỉ, phạm vi và thời hạn trên các minh chứng.</label>' : '<label class="field">Lý do<textarea name="reason" maxlength="1000" required></textarea></label>'}<div class="form-actions">${button("Quay lại hồ sơ", "review-house-verification", id)}<button type="submit" class="button ${decision === "APPROVE" ? "primary" : "danger"}">${decision === "APPROVE" ? "Xác nhận duyệt" : "Xác nhận"}</button></div></form>`);
}
function decideHouseVerification(form) {
  if (state.role !== "admin" || (state.lockedUsers || []).includes(userId())) return;
  const data = new FormData(form), value = (key) => String(data.get(key) ?? "").trim(), v = byId(state.houseVerifications,value("verificationId"));
  const decision = value("decision");
  if (!v || !["APPROVE","REJECT","REVOKE"].includes(decision) || (decision === "REVOKE" ? v.status !== "APPROVED" : v.status !== "PENDING")) return;
  const timestamp = new Date().toISOString();
  if (decision === "APPROVE") {
    const documents = houseVerificationDocuments(v), error = houseProofError(v,documents);
    if (error || v.validFrom > todayISO() || value("checkedEvidence") !== "yes" || (state.lockedUsers || []).includes(v.applicantId) || documents.some((d) => byId(state.houseProofFiles,d.fileId)?.ownerId !== v.applicantId)) { flash(error || "Cần đối chiếu đầy đủ minh chứng của đúng người nộp và thời hạn hiệu lực trước khi duyệt."); return; }
    for (const previous of state.houseVerifications.filter((item) => item.id !== v.id && item.houseId === v.houseId && item.status === "APPROVED")) previous.status = "SUPERSEDED";
    Object.assign(v, { status: "APPROVED", reviewedBy: userId(), reviewedAt: timestamp, evidenceCheckedAt: timestamp });
  } else {
    if (!value("reason") || value("reason").length > 1000) { flash("Nhập lý do xử lý hồ sơ."); return; }
    Object.assign(v, decision === "REVOKE" ? { status: "REVOKED", revokedBy: userId(), revokedAt: timestamp, revocationReason: value("reason") } : { status: "REJECTED", reviewedBy: userId(), reviewedAt: timestamp, rejectionReason: value("reason") });
  }
  logAudit(`HOUSE_RIGHTS_${decision}`, house(v.houseId)?.name || v.houseId, value("reason") || "Đã đối chiếu hồ sơ quyền cho thuê.");
  state.notifications.push({ id: `n-${v.id}-${decision}`, userId: v.applicantId, text: `Hồ sơ quyền cho thuê ${house(v.houseId)?.name}: ${HOUSE_VERIFICATION_LABELS[v.status][0]}.${value("reason") ? ` ${value("reason")}` : ""}`, read: false });
  finish("Đã cập nhật kết quả xác minh quyền cho thuê.");
}
function withdrawHouseVerification(id) {
  const v = byId(state.houseVerifications,id);
  if (!v || v.status !== "PENDING" || v.applicantId !== userId() || !canManageHouse(house(v.houseId))) return;
  Object.assign(v,{ status:"WITHDRAWN", withdrawnAt:new Date().toISOString(), withdrawalReason:"Người nộp rút hồ sơ." });
  finish("Đã rút hồ sơ. Bạn có thể nộp hồ sơ mới.");
}
